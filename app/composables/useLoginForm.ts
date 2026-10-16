import type { LoginRequest, LoginResponse } from '@/types/account'

type LoginFormState = {
  email: Ref<string>
  website: Ref<string>
  errorKey: ComputedRef<string | null>
  hasAttempted: Ref<boolean>
  isSubmitting: Ref<boolean>
  isSent: Ref<boolean>
  hasFailed: Ref<boolean>
  submit: () => Promise<void>
  reset: () => void
}

/**
 * Holds the login form state and asks the server to email a login link. The server answers the
 * same whether the address is known or not.
 * @returns Form state, validation error and the submit and reset actions
 */
export const useLoginForm = (): LoginFormState => {
  const { locale } = useI18n()
  const email: Ref<string> = ref('')
  const website: Ref<string> = ref('')
  const hasAttempted: Ref<boolean> = ref(false)
  const isSubmitting: Ref<boolean> = ref(false)
  const isSent: Ref<boolean> = ref(false)
  const hasFailed: Ref<boolean> = ref(false)

  const errorKey: ComputedRef<string | null> = computed(() => validateLoginEmail(email.value))

  const submit = async (): Promise<void> => {
    hasAttempted.value = true
    hasFailed.value = false
    if (errorKey.value || isSubmitting.value) {
      return
    }

    isSubmitting.value = true
    try {
      const body: LoginRequest = {
        email: email.value,
        locale: locale.value,
        website: website.value,
      }
      await $fetch<LoginResponse>('/api/auth/login', { method: 'POST', body })
      isSent.value = true
    } catch {
      hasFailed.value = true
    } finally {
      isSubmitting.value = false
    }
  }

  const reset = (): void => {
    isSent.value = false
    hasAttempted.value = false
    hasFailed.value = false
  }

  return { email, website, errorKey, hasAttempted, isSubmitting, isSent, hasFailed, submit, reset }
}
