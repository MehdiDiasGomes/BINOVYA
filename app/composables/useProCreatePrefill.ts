import type { ProCreatePrefill } from '@/types/proCreate'
import type {
  ProCreateFormState,
  ProCreatePrefillState,
  ProCreatePrefillStatus,
} from '@/types/proCreateForm'

import { PAGE_DATA_TIMEOUT_MS } from '@/constants/account'
import { PRO_RECREATE_QUERY } from '@/constants/proCreate'
import { prefilledProCreateDraft } from '@/utils/proCreate'

const UUID_PATTERN: RegExp = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i

/**
 * Fills the BINOVYA Pro intervention form from an intervention whose payment link expired, when
 * the page is opened with `?from=<booking id>` (« Create again »). The draft keeps a new request
 * id and no date. A failure leaves the form empty and says so, except an authentication error,
 * handled like the Pro pages.
 * @param form - State of the form
 * @returns Loading status and the text announcing it
 */
export const useProCreatePrefill = (form: ProCreateFormState): ProCreatePrefillState => {
  const { t, locale } = useI18n()
  const route = useRoute()
  const { handleAuthError } = useProAuthError()

  const status: Ref<ProCreatePrefillStatus> = ref('none')
  const customerName: Ref<string> = ref('')

  const statusText: ComputedRef<string> = computed(() => {
    if (status.value === 'none') {
      return ''
    }
    return t(`pro.create.recreate.${status.value}`, { name: customerName.value })
  })

  const load = async (bookingId: string): Promise<void> => {
    status.value = 'loading'
    try {
      const prefill: ProCreatePrefill = await $fetch<ProCreatePrefill>(
        `/api/pro/interventions/${encodeURIComponent(bookingId)}/prefill`,
        { timeout: PAGE_DATA_TIMEOUT_MS },
      )
      form.draft.value = prefilledProCreateDraft(prefill, locale.value)
      customerName.value = `${prefill.contact.firstName} ${prefill.contact.lastName}`.trim()
      status.value = 'loaded'
    } catch (error: unknown) {
      status.value = 'error'
      await handleAuthError(error)
    }
  }

  onMounted(async () => {
    const bookingId: unknown = route.query[PRO_RECREATE_QUERY]
    if (typeof bookingId === 'string' && UUID_PATTERN.test(bookingId)) {
      await load(bookingId)
    }
  })

  return { status: readonly(status), statusText }
}
