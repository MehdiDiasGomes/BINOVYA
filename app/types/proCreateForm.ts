import type { BookingAddress, BookingPlan } from '@/types/booking'
import type { FocusTarget } from '@/types/button'
import type {
  ProCreateDraft,
  ProCreateErrors,
  ProCreateField,
  ProCreatePrefillStatus,
} from '@/types/proCreate'
import type { ComputedRef, Ref } from 'vue'

export type ProCreateFormState = {
  draft: Ref<ProCreateDraft>
  hasAttempted: Ref<boolean>
  errors: ComputedRef<ProCreateErrors>
  errorText: (field: ProCreateField) => string
  priceFor: (plan: BookingPlan) => number | null
  priceCents: ComputedRef<number | null>
  hasGridError: ComputedRef<boolean>
  changeAddress: (address: BookingAddress | null) => void
  catchAddressError: (error: unknown) => Promise<boolean>
  renewRequestId: () => void
}

export type ProCreateSubmitState = {
  refusal: Ref<string>
  isForceable: Ref<boolean>
  isSubmitting: Ref<boolean>
  submitButtonRef: Ref<FocusTarget | null>
  submit: (force: boolean) => Promise<void>
}

export type ProPaymentLinkFeedback = {
  message: string
  isError: boolean
}

export type ProCreatedNoticeState = {
  remember: (text: string) => void
  announceOnLoad: (
    isLoading: Readonly<Ref<boolean>>,
    announce: (text: string) => Promise<void>,
  ) => void
}

export type ProCreatePrefillState = {
  status: Readonly<Ref<ProCreatePrefillStatus>>
  statusText: ComputedRef<string>
}
