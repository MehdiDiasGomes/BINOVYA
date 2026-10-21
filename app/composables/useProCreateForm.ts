import type { BookingAddress, BookingPlan, GridPrice } from '@/types/booking'
import type { ProCreateDraft, ProCreateErrors, ProCreateField } from '@/types/proCreate'
import type { ProCreateFormState } from '@/types/proCreateForm'

import { CONTACT_NAME_LIMITS } from '@/constants/booking'
import {
  PRO_ADMIN_NOTE_MAX_LENGTH,
  PRO_CREATE_FIELD_IDS,
  PRO_QUOTE_MAX_CENTS,
} from '@/constants/proCreate'
import { formatPrice } from '@/utils/pricing'
import { emptyProCreateDraft, validateProCreateDraft } from '@/utils/proCreate'
import { parseQuoteAmountCents } from '@/utils/proCreateValidation'

/**
 * Holds the BINOVYA Pro intervention form: the draft, its price (from the grid shared with the
 * online booking, or the quote price typed by the admin), and its errors once a submission was
 * attempted. An address the server refused (expired token) is cleared and its error shown until
 * another one is chosen. The request id of the draft is renewed only after a creation, or when
 * the server released the booking it created.
 * @returns Draft, errors, prices, the address handlers and the request id renewal
 */
export const useProCreateForm = (): ProCreateFormState => {
  const { t, locale } = useI18n()
  const {
    errorKey: addressErrorKey,
    catchInvalidAddress,
    focusAddress,
    clear: clearAddressError,
  } = useAddressError(PRO_CREATE_FIELD_IDS.address)

  const draft: Ref<ProCreateDraft> = ref(emptyProCreateDraft())
  const hasAttempted: Ref<boolean> = ref(false)

  const gridPrice: GridPrice = useGridPrice({
    counts: () => ({ small: draft.value.smallBinCount, large: draft.value.largeBinCount }),
    plan: () => draft.value.plan,
  })

  const isQuote: ComputedRef<boolean> = computed(() => draft.value.priceSource === 'quote')

  const quoteCents: ComputedRef<number | null> = computed(() =>
    parseQuoteAmountCents(draft.value.quoteAmount),
  )

  const priceFor = (plan: BookingPlan): number | null =>
    isQuote.value ? quoteCents.value : gridPrice.priceFor(plan)

  const priceCents: ComputedRef<number | null> = computed(() =>
    isQuote.value ? quoteCents.value : gridPrice.priceCents.value,
  )

  const isQuoteRequired: ComputedRef<boolean> = computed(
    () => !isQuote.value && gridPrice.isQuoteRequired.value,
  )

  const errors: ComputedRef<ProCreateErrors> = computed(() => {
    const found: ProCreateErrors = validateProCreateDraft(draft.value, isQuoteRequired.value)
    if (addressErrorKey.value) {
      found.address = addressErrorKey.value
    }
    return found
  })

  const errorText = (field: ProCreateField): string => {
    const key: string | undefined = errors.value[field]
    const isShown: boolean = hasAttempted.value || (field === 'bins' && isQuoteRequired.value)
    return isShown && key
      ? t(key, {
          ...CONTACT_NAME_LIMITS,
          maxAmount: formatPrice(PRO_QUOTE_MAX_CENTS, locale.value),
          maxLength: PRO_ADMIN_NOTE_MAX_LENGTH,
        })
      : ''
  }

  const changeAddress = (address: BookingAddress | null): void => {
    draft.value.address = address
    if (address) {
      clearAddressError()
    }
  }

  const catchAddressError = async (error: unknown): Promise<boolean> => {
    if (!catchInvalidAddress(error)) {
      return false
    }
    draft.value.address = null
    await focusAddress()
    return true
  }

  const renewRequestId = (): void => {
    draft.value.requestId = crypto.randomUUID()
  }

  onBeforeUnmount(clearAddressError)

  return {
    draft,
    hasAttempted,
    errors,
    errorText,
    priceFor,
    priceCents,
    hasGridError: gridPrice.hasGridError,
    changeAddress,
    catchAddressError,
    renewRequestId,
  }
}
