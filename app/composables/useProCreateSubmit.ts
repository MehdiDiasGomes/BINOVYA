import type { FocusTarget } from '@/types/button'
import type { ProCreateField, ProCreateRequest, ProCreateResponse } from '@/types/proCreate'
import type { ProCreateFormState, ProCreateSubmitState } from '@/types/proCreateForm'

import { PRO_AVAILABILITY_HORIZON_DAYS } from '@/constants/pro'
import {
  PRO_CREATE_FIELD_IDS,
  PRO_CREATE_FIELDS,
  PRO_CREATE_TIMEOUT_MS,
  PRO_MAX_BINS_PER_SERVICE,
} from '@/constants/proCreate'
import { addDaysToIsoDate, formatFullDate } from '@/utils/date'
import { isFetchTimeoutError, readFetchErrorCode } from '@/utils/fetchError'
import { focusFirstElement } from '@/utils/focus'
import { isForceableRescheduleCode, overriddenReasonsText } from '@/utils/proAvailability'
import { isProCreateErrorCode, toProCreateRequest } from '@/utils/proCreate'
import { interventionPageRoute } from '@/utils/proSteps'

/**
 * Submits the BINOVYA Pro intervention form. An invalid form focuses its first invalid field. A
 * forceable refusal (out of area, closed, full or out of sector day) offers « Force anyway »; any
 * other refusal, or a timeout whose result is unknown, is shown and focus returns to the submit
 * button. On success the result is kept for the intervention page, which announces it once loaded.
 * @param form - State of the form
 * @returns Refusal text, whether it can be forced, the submitting flag, the submit button ref and
 * the submit action
 */
export const useProCreateSubmit = (form: ProCreateFormState): ProCreateSubmitState => {
  const { t, locale } = useI18n()
  const localePath = useLocalePath()
  const today: Readonly<Ref<string>> = useBusinessToday()
  const { handleAuthError } = useProAuthError()
  const { remember } = useProCreatedNotice()

  const refusal: Ref<string> = ref('')
  const isForceable: Ref<boolean> = ref(false)
  const isSubmitting: Ref<boolean> = ref(false)
  const submitButtonRef: Ref<FocusTarget | null> = ref(null)

  watch(
    form.draft,
    (): void => {
      if (!isSubmitting.value) {
        refusal.value = ''
        isForceable.value = false
      }
    },
    { deep: true },
  )

  const refusalText = (error: unknown, code: unknown): string => {
    if (isFetchTimeoutError(error)) {
      return t('pro.create.errors.timeout')
    }
    const maxDate: string = addDaysToIsoDate(today.value, PRO_AVAILABILITY_HORIZON_DAYS)
    return isProCreateErrorCode(code)
      ? t(`pro.create.errors.${code}`, {
          date: formatFullDate(maxDate, locale.value),
          max: PRO_MAX_BINS_PER_SERVICE,
        })
      : t('pro.create.errors.generic')
  }

  const showRefusal = async (error: unknown, wasForced: boolean): Promise<void> => {
    const code: unknown = readFetchErrorCode(error)
    refusal.value = refusalText(error, code)
    isForceable.value = !wasForced && isForceableRescheduleCode(code)
    if (!isForceable.value) {
      await nextTick()
      submitButtonRef.value?.focus()
    }
  }

  const successNotice = (response: ProCreateResponse): string => {
    const name: string = `${form.draft.value.contact.firstName} ${form.draft.value.contact.lastName}`
    const success: string = t(`pro.create.success.${response.mode}`, {
      name: name.trim(),
      date: formatFullDate(form.draft.value.date, locale.value),
    })
    const forced: string = overriddenReasonsText(response.overriddenCodes, locale.value, t)
    const emailFailed: string = response.isEmailSent
      ? ''
      : t(`pro.create.emailFailed.${response.mode}`)
    return [success, forced, emailFailed].filter(text => text.length > 0).join(' ')
  }

  const focusFirstInvalid = async (): Promise<boolean> => {
    const invalid: ProCreateField[] = PRO_CREATE_FIELDS.filter(field => form.errors.value[field])
    if (invalid.length === 0) {
      return false
    }
    await nextTick()
    focusFirstElement(invalid.map(field => PRO_CREATE_FIELD_IDS[field]))
    return true
  }

  const send = async (request: ProCreateRequest): Promise<void> => {
    const response: ProCreateResponse = await $fetch<ProCreateResponse>('/api/pro/bookings', {
      method: 'POST',
      body: request,
      timeout: PRO_CREATE_TIMEOUT_MS,
    })
    remember(successNotice(response))
    await navigateTo(localePath(interventionPageRoute(response.bookingId, 'planning')))
  }

  const submit = async (force: boolean): Promise<void> => {
    if (isSubmitting.value) {
      return
    }
    form.hasAttempted.value = true
    const request: ProCreateRequest | null = toProCreateRequest(form.draft.value, force)
    if ((await focusFirstInvalid()) || !request) {
      return
    }
    isSubmitting.value = true
    try {
      await send(request)
    } catch (error: unknown) {
      if (!(await handleAuthError(error)) && !(await form.catchAddressError(error))) {
        await showRefusal(error, force)
      }
    } finally {
      isSubmitting.value = false
    }
  }

  return { refusal, isForceable, isSubmitting, submitButtonRef, submit }
}
