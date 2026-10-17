import type { LucideIconName } from '@/constants/clients'
import type { LoginEndpoint } from '@/types/account'
import type { ComputedRef, Ref } from 'vue'

export type LoginLinkConfirmOptions = {
  targetPath: string
  isLoggedIn: Readonly<Ref<boolean>>
  failedTitleRef: Readonly<Ref<HTMLElement | null>>
}

export type LoginLinkConfirmState = {
  hasFailed: Ref<boolean>
  isVerifying: Ref<boolean>
}

export type LoginPageOptions = {
  endpoint: LoginEndpoint
  emailFieldId: string
  sentTitleRef: Readonly<Ref<HTMLElement | null>>
}

export type LoginFormState = {
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

export type LoginPageState = LoginFormState & {
  visibleError: ComputedRef<string>
  handleSubmit: () => Promise<void>
  showLoginForm: () => Promise<void>
}

export type LoginNotice = {
  icon: LucideIconName
  iconClass: string
  text: string
}
