import type { LoginLinkConfirmOptions, LoginLinkConfirmState } from '@/types/loginPage'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Verifies the login link token carried in the URL fragment of a confirm page, in the browser
 * only, removes the fragment from the address bar, then goes to the target page. An already
 * logged-in visitor with a used or missing token goes there too; anyone else gets the failure
 * state, with focus moved to its title.
 * @param options - Page reached after login, whether the visitor is already logged in and the
 * title of the failure state
 * @returns Failure and verification flags of the page
 */
export const useLoginLinkConfirm = (options: LoginLinkConfirmOptions): LoginLinkConfirmState => {
  const localePath = useLocalePath()
  const supabase: SupabaseClient = useSupabaseClient()
  const hasFailed: Ref<boolean> = ref(false)
  const isVerifying: Ref<boolean> = ref(false)

  const takeLinkParams = (): URLSearchParams => {
    const params: URLSearchParams = new URLSearchParams(window.location.hash.slice(1))
    window.history.replaceState(
      window.history.state,
      '',
      `${window.location.pathname}${window.location.search}`,
    )
    return params
  }

  const goToTarget = async (): Promise<void> => {
    await navigateTo(localePath(options.targetPath), { replace: true })
  }

  const showFailure = async (): Promise<void> => {
    isVerifying.value = false
    hasFailed.value = true
    await nextTick()
    options.failedTitleRef.value?.focus()
  }

  const verifyLink = async (): Promise<void> => {
    const params: URLSearchParams = takeLinkParams()
    const tokenHash: string | null = params.get('token_hash')
    if (!tokenHash) {
      await (options.isLoggedIn.value ? goToTarget() : showFailure())
      return
    }
    isVerifying.value = true
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'email',
    })
    await (error && !options.isLoggedIn.value ? showFailure() : goToTarget())
  }

  const runVerification = (): void => {
    if (isVerifying.value) {
      return
    }
    verifyLink().catch(showFailure)
  }

  const handleHashChange = (): void => {
    if (new URLSearchParams(window.location.hash.slice(1)).has('token_hash')) {
      hasFailed.value = false
      runVerification()
    }
  }

  onMounted(() => {
    window.addEventListener('hashchange', handleHashChange)
    runVerification()
  })

  onBeforeUnmount(() => {
    window.removeEventListener('hashchange', handleHashChange)
  })

  return { hasFailed, isVerifying }
}
