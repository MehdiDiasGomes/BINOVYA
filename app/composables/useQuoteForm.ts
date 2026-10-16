import type { BookingAddress } from '@/types/booking'
import type { QuoteErrors, QuoteForm, QuotePayload } from '@/types/quote'

import { QUOTE_ADDRESS_INPUT_ID } from '@/constants/quote'

type QuoteFormState = {
  form: Ref<QuoteForm>
  photos: Ref<File[]>
  errors: ComputedRef<QuoteErrors>
  hasAttempted: Ref<boolean>
  isSubmitting: Ref<boolean>
  isSent: Ref<boolean>
  hasFailed: Ref<boolean>
  addressErrorKey: Ref<string | null>
  focusAddress: () => Promise<void>
  submit: () => Promise<void>
}

/**
 * Holds the quote request form, prefilled from the booking in progress, and sends it.
 * @returns Form state, validation errors and the submit action
 */
export const useQuoteForm = (): QuoteFormState => {
  const { draft } = useBookingDraft()
  const {
    errorKey: addressErrorKey,
    catchInvalidAddress,
    focusAddress,
    clear: clearAddressError,
  } = useAddressError(QUOTE_ADDRESS_INPUT_ID)
  clearAddressError()

  const form: Ref<QuoteForm> = ref({
    contact: { ...draft.value.contact, company: '' },
    address: draft.value.address,
    equipment: ['bins'],
    smallBinCount: draft.value.quantities['small-bin'],
    largeBinCount: draft.value.quantities['large-bin'],
    plan: null,
    comment: '',
    website: '',
  })
  const photos: Ref<File[]> = ref([])
  const hasAttempted: Ref<boolean> = ref(false)
  const isSubmitting: Ref<boolean> = ref(false)
  const isSent: Ref<boolean> = ref(false)
  const hasFailed: Ref<boolean> = ref(false)

  const errors: ComputedRef<QuoteErrors> = computed(() => validateQuote(form.value))

  watch(
    () => form.value.address,
    (address: BookingAddress | null): void => {
      if (address) {
        clearAddressError()
      }
    },
  )

  const buildBody = (address: NonNullable<QuoteForm['address']>): FormData => {
    const hasBins: boolean = form.value.equipment.includes('bins')
    const payload: QuotePayload = {
      contact: toQuoteContactPayload(form.value),
      address,
      equipment: form.value.equipment,
      smallBinCount: hasBins ? form.value.smallBinCount : 0,
      largeBinCount: hasBins ? form.value.largeBinCount : 0,
      plan: form.value.plan,
      comment: form.value.comment,
      website: form.value.website,
    }
    const body = new FormData()
    body.append('payload', JSON.stringify(payload))
    photos.value.forEach(photo => body.append('photos', photo))
    return body
  }

  const submit = async (): Promise<void> => {
    hasAttempted.value = true
    hasFailed.value = false
    const { address } = form.value
    if (Object.keys(errors.value).length > 0 || !address || isSubmitting.value) {
      return
    }

    isSubmitting.value = true
    try {
      await $fetch('/api/quote', { method: 'POST', body: buildBody(address) })
      isSent.value = true
    } catch (error) {
      if (catchInvalidAddress(error)) {
        form.value.address = null
      } else {
        hasFailed.value = true
      }
    } finally {
      isSubmitting.value = false
    }
  }

  return {
    form,
    photos,
    errors,
    hasAttempted,
    isSubmitting,
    isSent,
    hasFailed,
    addressErrorKey,
    focusAddress,
    submit,
  }
}
