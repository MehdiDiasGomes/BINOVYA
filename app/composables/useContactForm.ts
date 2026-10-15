import type { ContactForm, ContactFormErrors, ContactResponse } from '@/types/contact'

type ContactFormState = {
  form: Ref<ContactForm>
  errors: ComputedRef<ContactFormErrors>
  hasAttempted: Ref<boolean>
  isSubmitting: Ref<boolean>
  isSent: Ref<boolean>
  hasFailed: Ref<boolean>
  submit: () => Promise<void>
}

/**
 * Holds the contact form state, validates it and sends it to the contact endpoint.
 * @returns Form state, validation errors and the submit action
 */
export const useContactForm = (): ContactFormState => {
  const form: Ref<ContactForm> = ref({
    firstName: '',
    lastName: '',
    company: '',
    email: '',
    phone: '',
    phoneCountryCode: 'FR',
    subject: '',
    message: '',
    website: '',
  })
  const hasAttempted: Ref<boolean> = ref(false)
  const isSubmitting: Ref<boolean> = ref(false)
  const isSent: Ref<boolean> = ref(false)
  const hasFailed: Ref<boolean> = ref(false)

  const errors: ComputedRef<ContactFormErrors> = computed(() => validateContactForm(form.value))

  const submit = async (): Promise<void> => {
    hasAttempted.value = true
    hasFailed.value = false
    if (Object.keys(errors.value).length > 0 || isSubmitting.value) {
      return
    }

    isSubmitting.value = true
    try {
      await $fetch<ContactResponse>('/api/contact', {
        method: 'POST',
        body: toContactPayload(form.value),
      })
      isSent.value = true
    } catch {
      hasFailed.value = true
    } finally {
      isSubmitting.value = false
    }
  }

  return { form, errors, hasAttempted, isSubmitting, isSent, hasFailed, submit }
}
