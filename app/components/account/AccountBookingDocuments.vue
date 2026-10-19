<template>
  <div class="space-y-8">
    <p class="sr-only" role="status" aria-live="polite">{{ notice }}</p>
    <section v-if="props.showPhotos" :aria-labelledby="photosTitleId">
      <h2
        :id="photosTitleId"
        ref="photosTitleRef"
        tabindex="-1"
        class="text-[22px] font-black text-ink outline-none"
      >
        {{ $t('account.detail.photos.title') }}
      </h2>
      <p class="mt-1.5 text-[15px] text-ink/80">
        {{ $t(introKey) }}
      </p>
      <ul class="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <li v-for="kind in PHOTO_KINDS" :key="kind">
          <p class="font-heading text-sm font-bold text-ink">
            {{ $t(`account.detail.photos.kinds.${kind}`) }}
          </p>
          <a
            v-if="visibleUrl(kind)"
            :href="visibleUrl(kind)"
            target="_blank"
            rel="noopener noreferrer"
            class="mt-2 block overflow-hidden rounded-3xl border border-border bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
            @click="openPhoto"
          >
            <img
              :src="visibleUrl(kind)"
              :alt="$t(`account.detail.photos.alt.${kind}`)"
              class="aspect-[4/3] w-full object-cover"
              @error="markFailed(kind, $event)"
            />
            <span class="sr-only">{{ $t('account.detail.newTab') }}</span>
          </a>
          <div
            v-else
            class="mt-2 flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/50 bg-paper-2 p-3 text-center text-[13px] font-semibold text-ink/80 sm:text-sm"
          >
            <Icon
              :name="failedKinds.includes(kind) ? 'ImageOff' : 'Camera'"
              :size="20"
              aria-hidden="true"
              class="shrink-0"
            />
            {{ $t(placeholderKey(kind)) }}
          </div>
        </li>
      </ul>
      <AnimatePresence :initial="false">
        <Motion
          v-if="failedKinds.length > 0"
          key="reload"
          as="div"
          :initial="{ opacity: 1, y: -FEEDBACK_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="STEP_TRANSITION"
          class="mt-4"
        >
          <AppButton
            ref="reloadButtonRef"
            variant="secondary"
            icon="RotateCw"
            class="w-full sm:w-auto"
            @click="retryPhotos"
          >
            {{ $t('account.detail.photos.reload') }}
          </AppButton>
        </Motion>
      </AnimatePresence>
    </section>

    <section :aria-labelledby="receiptTitleId">
      <h2 :id="receiptTitleId" class="text-[22px] font-black text-ink">
        {{ $t('account.detail.receipt.title') }}
      </h2>
      <div class="mt-4 rounded-3xl border border-border bg-white px-5 py-4 shadow-sm">
        <AppButton
          v-if="props.documents.receiptUrl"
          :href="props.documents.receiptUrl"
          target="_blank"
          rel="noopener noreferrer"
          variant="secondary"
          icon="Receipt"
          class="w-full sm:w-auto"
        >
          {{ $t('account.detail.receipt.open') }}
          <span class="sr-only">{{ $t('account.detail.newTab') }}</span>
        </AppButton>
        <p v-else class="flex min-h-12 items-center gap-2 text-sm font-bold text-ink/80">
          <Icon name="Receipt" :size="18" aria-hidden="true" class="shrink-0" />
          {{ $t('account.detail.receipt.unavailable') }}
        </p>
        <p class="mt-3 text-sm text-ink/80">{{ $t('account.detail.receipt.hint') }}</p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type {
  AccountBookingDocuments,
  AccountLinksRefresh,
  AccountPhotoKind,
} from '@/types/account'
import type { FocusTarget } from '@/types/button'

import {
  ACCOUNT_PHOTO_URL_LIFETIME_SECONDS,
  ACCOUNT_PHOTO_URL_REFRESH_MARGIN_SECONDS,
} from '@/constants/account'
import { FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { PHOTO_KINDS } from '@/constants/photos'

const props = withDefaults(
  defineProps<{
    showPhotos?: boolean
    isCompleted?: boolean
    documents?: AccountBookingDocuments
    refreshLinks?: () => Promise<AccountLinksRefresh>
  }>(),
  {
    showPhotos: true,
    isCompleted: false,
    documents: () => ({ photos: { before: null, after: null }, receiptUrl: null }),
    refreshLinks: async (): Promise<AccountLinksRefresh> => 'failed',
  },
)

const photosTitleId: string = useId()
const receiptTitleId: string = useId()

const URL_MAX_AGE_MS: number =
  (ACCOUNT_PHOTO_URL_LIFETIME_SECONDS - ACCOUNT_PHOTO_URL_REFRESH_MARGIN_SECONDS) * 1000

const { t } = useI18n()
const { message: notice, announce } = useLiveAnnouncement()

const failedKinds: Ref<AccountPhotoKind[]> = ref([])

const reloadButtonRef: Ref<FocusTarget | null> = ref(null)

const photosTitleRef: Ref<HTMLElement | null> = ref(null)

let receivedAt: number = Date.now()

let expiryTimer: ReturnType<typeof setTimeout> | undefined

let hasRequestedLinks: boolean = false

let pendingNoticeKey: string | null = null

let retryTrigger: Element | null = null

const hasPhoto: ComputedRef<boolean> = computed(() =>
  PHOTO_KINDS.some(kind => Boolean(props.documents.photos[kind])),
)

const isExpired = (): boolean => Date.now() - receivedAt > URL_MAX_AGE_MS

/**
 * Asks the page for fresh photo links once. On failure the photos stay on screen, the next tap
 * retries, and the customer hears about it only when the refresh followed their own action.
 * Nothing is announced when the session expired, the page is already redirecting.
 */
const requestLinks = async (): Promise<void> => {
  clearTimeout(expiryTimer)
  if (hasRequestedLinks || !hasPhoto.value) {
    return
  }
  hasRequestedLinks = true
  const result: AccountLinksRefresh = await props
    .refreshLinks()
    .catch((): AccountLinksRefresh => 'failed')
  if (result === 'ok') {
    return
  }
  hasRequestedLinks = false
  const noticeKey: string | null = pendingNoticeKey
  pendingNoticeKey = null
  retryTrigger = null
  if (noticeKey && result === 'failed') {
    await announce(t('account.detail.photos.refreshFailed'))
  }
}

const scheduleExpiry = (): void => {
  clearTimeout(expiryTimer)
  if (props.showPhotos && hasPhoto.value) {
    expiryTimer = setTimeout(requestLinks, URL_MAX_AGE_MS)
  }
}

const handleVisibility = (): void => {
  if (document.visibilityState === 'visible' && isExpired()) {
    requestLinks()
  }
}

watch(
  () => props.documents,
  async (): Promise<void> => {
    if (retryTrigger && document.activeElement === retryTrigger) {
      photosTitleRef.value?.focus()
    }
    retryTrigger = null
    failedKinds.value = []
    receivedAt = Date.now()
    hasRequestedLinks = false
    scheduleExpiry()
    const noticeKey: string | null = pendingNoticeKey
    pendingNoticeKey = null
    if (noticeKey) {
      await announce(t(noticeKey))
    }
  },
)

onMounted((): void => {
  receivedAt = Date.now()
  scheduleExpiry()
  document.addEventListener('visibilitychange', handleVisibility)
})

onBeforeUnmount((): void => {
  clearTimeout(expiryTimer)
  document.removeEventListener('visibilitychange', handleVisibility)
})

const introKey: ComputedRef<string> = computed(() => {
  if (hasPhoto.value) {
    return 'account.detail.photos.textAvailable'
  }
  return props.isCompleted ? 'account.detail.photos.textNone' : 'account.detail.photos.text'
})

const placeholderKey = (kind: AccountPhotoKind): string => {
  if (failedKinds.value.includes(kind)) {
    return 'account.detail.photos.failed'
  }
  return props.isCompleted
    ? 'account.detail.photos.placeholderNone'
    : 'account.detail.photos.placeholder'
}

const openPhoto = (event: MouseEvent): void => {
  if (isExpired()) {
    event.preventDefault()
    pendingNoticeKey = 'account.detail.photos.refreshed'
    requestLinks()
  }
}

/**
 * Reloads the photos that failed through fresh links, without reloading the booking. On success
 * focus moves to the photos heading before « Reload the photos » leaves the page.
 */
const retryPhotos = async (): Promise<void> => {
  pendingNoticeKey = 'account.detail.photos.reloaded'
  retryTrigger = document.activeElement
  hasRequestedLinks = false
  await requestLinks()
}

const visibleUrl = (kind: AccountPhotoKind): string | undefined =>
  failedKinds.value.includes(kind) ? undefined : (props.documents.photos[kind] ?? undefined)

/**
 * Replaces a photo that failed to load by its placeholder and announces it. When its link had
 * focus, focus moves to « Reload the photos » instead of falling back to the page body.
 * @param kind - Photo that failed
 * @param event - `error` event of the image
 */
const markFailed = async (kind: AccountPhotoKind, event: Event): Promise<void> => {
  if (failedKinds.value.includes(kind)) {
    return
  }
  const link: HTMLAnchorElement | null =
    event.target instanceof HTMLElement ? event.target.closest('a') : null
  const hadFocus: boolean = link !== null && link === document.activeElement
  failedKinds.value = [...failedKinds.value, kind]
  await announce(t('account.detail.photos.failed'))
  if (hadFocus) {
    await nextTick()
    reloadButtonRef.value?.focus()
  }
}
</script>
