import type { LoginFormState, LoginPageOptions, LoginPageState } from '@/types/loginPage'

import { focusFirstElement } from '@/utils/focus'

/**
 * Wires a login link page around `useLoginForm`: the translated field error once the visitor has
 * tried to submit, focus on the confirmation title after sending, on the email field otherwise.
 * @param options - Login route, id of the email field and title of the confirmation state
 * @returns Form state, visible error, and the submit and back-to-form actions
 */
export const useLoginPage = (options: LoginPageOptions): LoginPageState => {
  const { t } = useI18n()
  const form: LoginFormState = useLoginForm(options.endpoint)

  const visibleError: ComputedRef<string> = computed(() =>
    form.hasAttempted.value && form.errorKey.value ? t(form.errorKey.value) : '',
  )

  const handleSubmit = async (): Promise<void> => {
    await form.submit()
    await nextTick()
    if (form.isSent.value) {
      options.sentTitleRef.value?.focus()
      return
    }
    if (form.errorKey.value) {
      focusFirstElement([options.emailFieldId])
    }
  }

  const showLoginForm = async (): Promise<void> => {
    form.reset()
    await nextTick()
    focusFirstElement([options.emailFieldId])
  }

  return { ...form, visibleError, handleSubmit, showLoginForm }
}
