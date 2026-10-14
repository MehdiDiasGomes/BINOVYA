import type { QuoteErrors, QuoteForm, QuotePayload } from '@/types/quote'

type QuoteFormState = {
  form: Ref<QuoteForm>
  photos: Ref<File[]>
  errors: ComputedRef<QuoteErrors>
  hasAttempted: Ref<boolean>
  isSubmitting: Ref<boolean>
  isSent: Ref<boolean>
  hasFailed: Ref<boolean>
  submit: () => Promise<void>
}

/**
 * Holds the quote request form, prefilled from the booking in progress, and sends it.
 * @returns Form state, validation errors and the submit action
 */
export const useQuoteForm = (): QuoteFormState => {
  const { draft } = useBookingDraft()

  const form: Ref<QuoteForm> = ref({
    contact: { ...draft.value.contact, company: '' },
    address: draft.value.address,
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

  const buildBody = (address: NonNullable<QuoteForm['address']>): FormData => {
    const payload: QuotePayload = {
      contact: toQuoteContactPayload(form.value),
      address,
      smallBinCount: form.value.smallBinCount,
      largeBinCount: form.value.largeBinCount,
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
    } catch {
      hasFailed.value = true
    } finally {
      isSubmitting.value = false
    }
  }

  return { form, photos, errors, hasAttempted, isSubmitting, isSent, hasFailed, submit }
}
