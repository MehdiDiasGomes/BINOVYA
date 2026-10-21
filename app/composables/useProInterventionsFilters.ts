import type {
  ProFiltersDraft,
  ProInterventionsFiltersState,
  ProInterventionsQuery,
  ProNavigationOptions,
} from '@/types/pro'
import type { LocationQueryRaw } from 'vue-router'

import { readDate, readListPage, readStatusFilter } from '@/utils/proInterventionsQuery'

const isSameFilters = (left: ProFiltersDraft, right: ProFiltersDraft): boolean =>
  left.status === right.status && left.from === right.from && left.to === right.to

/**
 * Keeps the filters and the page of the interventions list in sync with the URL.
 * @returns Draft filters, server query, current page, range error and the list actions
 */
export const useProInterventionsFilters = (): ProInterventionsFiltersState => {
  const { t } = useI18n()
  const route = useRoute()
  const router = useRouter()
  const today: Readonly<Ref<string>> = useBusinessToday()

  const applied: ComputedRef<ProFiltersDraft> = computed((): ProFiltersDraft => {
    const from: string = readDate(route.query, 'from', today.value)
    const to: string = readDate(route.query, 'to', '')
    return { status: readStatusFilter(route.query), from, to: from && to && from > to ? '' : to }
  })

  const draft: ProFiltersDraft = reactive({ ...applied.value })

  const currentPage: ComputedRef<number> = computed(() => readListPage(route.query))

  const query: ComputedRef<ProInterventionsQuery> = computed(() => ({
    status: applied.value.status,
    from: applied.value.from || undefined,
    to: applied.value.to || undefined,
    page: currentPage.value,
  }))

  const isRangeValid: ComputedRef<boolean> = computed(
    () => !draft.from || !draft.to || draft.from <= draft.to,
  )

  const rangeError: ComputedRef<string> = computed(() =>
    isRangeValid.value ? '' : t('pro.list.filters.rangeError'),
  )

  watch(applied, (filters: ProFiltersDraft): void => {
    Object.assign(draft, filters)
  })

  const navigateWithQuery = async (
    next: LocationQueryRaw,
    options: ProNavigationOptions = {},
  ): Promise<void> => {
    await (options.replace ? router.replace({ query: next }) : router.push({ query: next }))
  }

  const applyFilters = async (): Promise<void> => {
    if (!isRangeValid.value || isSameFilters(draft, applied.value)) {
      return
    }
    await navigateWithQuery(
      { status: draft.status, from: draft.from, to: draft.to || undefined },
      { replace: true },
    )
  }

  watch(draft, applyFilters)

  const resetFilters = async (): Promise<void> => {
    await navigateWithQuery({}, { replace: true })
    Object.assign(draft, applied.value)
  }

  const goToPage = async (page: number, options: ProNavigationOptions = {}): Promise<void> => {
    if (page < 1 || page === currentPage.value) {
      return
    }
    await navigateWithQuery({ ...route.query, page: String(page) }, options)
  }

  return { draft, query, currentPage, rangeError, resetFilters, goToPage }
}
