import type { BookingAddress, BookingPlan, PriceGridState } from '@/types/booking'
import type { ProCreateDraft, ProCreateErrors, ProCreateField } from '@/types/proCreate'
import type { ProCreateFormState } from '@/types/proCreateForm'

import { CONTACT_NAME_LIMITS } from '@/constants/booking'
import { PRO_CREATE_FIELD_IDS } from '@/constants/proCreate'
import { findPriceCents } from '@/utils/pricing'
import { emptyProCreateDraft, validateProCreateDraft } from '@/utils/proCreate'

/**
 * Holds the BINOVYA Pro intervention form: the draft, its price from the grid shared with the
 * online booking, and its errors once a submission was attempted. An address the server refused
 * (expired token) is cleared and its error shown until another one is chosen.
 * @returns Draft, errors, prices and the address handlers
 */
export const useProCreateForm = (): ProCreateFormState => {
  const { t } = useI18n()
  const { grid, isGridReady, hasGridError }: PriceGridState = usePriceGrid()
  const {
    errorKey: addressErrorKey,
    catchInvalidAddress,
    focusAddress,
    clear: clearAddressError,
  } = useAddressError(PRO_CREATE_FIELD_IDS.address)

  const draft: Ref<ProCreateDraft> = ref(emptyProCreateDraft())
  const hasAttempted: Ref<boolean> = ref(false)

  const priceFor = (plan: BookingPlan): number | null =>
    findPriceCents(grid.value, plan, {
      small: draft.value.smallBinCount,
      large: draft.value.largeBinCount,
    })

  const priceCents: ComputedRef<number | null> = computed(() => priceFor(draft.value.plan))

  const isQuoteRequired: ComputedRef<boolean> = computed(
    () =>
      isGridReady.value &&
      draft.value.smallBinCount + draft.value.largeBinCount > 0 &&
      priceCents.value === null,
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
    return isShown && key ? t(key, CONTACT_NAME_LIMITS) : ''
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

  onBeforeUnmount(clearAddressError)

  return {
    draft,
    hasAttempted,
    errors,
    errorText,
    priceFor,
    priceCents,
    hasGridError,
    changeAddress,
    catchAddressError,
  }
}
