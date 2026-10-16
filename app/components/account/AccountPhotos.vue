<template>
  <section :aria-labelledby="titleId" class="mt-5 border-t border-border pt-5">
    <h4 :id="titleId" class="text-base font-black text-ink">
      {{ $t('account.photos.title') }}
    </h4>
    <p
      v-if="sortedPhotos.length === 0"
      class="mt-3 flex items-center gap-2 rounded-xl bg-paper-2 px-4 py-3 text-sm text-ink/80"
    >
      <Icon name="Clock" :size="16" aria-hidden="true" class="shrink-0" />
      {{ $t('account.photos.pending') }}
    </p>
    <template v-else>
      <ul class="mt-3 grid grid-cols-2 gap-3">
        <li v-for="photo in sortedPhotos" :key="photo.kind">
          <p
            v-if="failedKinds.includes(photo.kind)"
            class="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-ink/50 bg-paper-2 p-3 text-center text-sm font-bold text-ink"
          >
            <Icon name="ImageOff" :size="16" aria-hidden="true" class="shrink-0" />
            {{ $t('account.photos.loadError', { kind: $t(`account.photos.kinds.${photo.kind}`) }) }}
          </p>
          <figure v-else>
            <button
              type="button"
              :aria-label="enlargeLabel(photo)"
              class="group block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
              @click="openPhoto(photo)"
            >
              <img
                :src="photo.url"
                :alt="altFor(photo)"
                loading="lazy"
                class="aspect-[4/3] w-full object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                @error="markFailed(photo.kind)"
              />
            </button>
            <figcaption class="mt-1.5 text-sm font-bold text-ink">
              {{ $t(`account.photos.kinds.${photo.kind}`) }}
            </figcaption>
          </figure>
        </li>
      </ul>
      <p class="mt-2 text-[13px] text-ink/70">{{ $t('account.photos.expiryHint') }}</p>
    </template>

    <dialog
      ref="dialogRef"
      :aria-label="selectedPhoto ? dialogLabel(selectedPhoto) : undefined"
      class="m-auto max-h-[90vh] max-w-[min(960px,92vw)] overflow-auto rounded-2xl bg-white p-4 shadow-xl open:animate-in open:fade-in open:zoom-in-95 open:duration-200 backdrop:bg-ink/70 backdrop:backdrop-blur-sm open:backdrop:animate-in open:backdrop:fade-in open:backdrop:duration-200 motion-reduce:open:animate-none motion-reduce:open:backdrop:animate-none sm:p-5"
      @close="selectedPhoto = null"
    >
      <img
        v-if="selectedPhoto"
        :src="selectedPhoto.url"
        :alt="altFor(selectedPhoto)"
        class="max-h-[75vh] w-full rounded-lg object-contain"
      />
      <button
        type="button"
        class="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-ink/50 px-5 text-sm font-bold text-ink transition-all duration-150 hover:border-primary hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100 sm:w-auto"
        @click="closePhoto"
      >
        <Icon name="X" :size="16" aria-hidden="true" />
        {{ $t('account.photos.close') }}
      </button>
    </dialog>
  </section>
</template>

<script setup lang="ts">
import type { AccountPhoto, AccountPhotoKind } from '@/types/account'

import { ACCOUNT_PHOTO_KINDS } from '@/constants/account'

const props = withDefaults(
  defineProps<{
    bookingId: string
    dateLabel: string
    photos?: AccountPhoto[]
  }>(),
  {
    photos: () => [],
  },
)

const { t } = useI18n()

const titleId: ComputedRef<string> = computed(() => `account-photos-${props.bookingId}`)
const dialogRef: Ref<HTMLDialogElement | null> = ref(null)
const selectedPhoto: Ref<AccountPhoto | null> = ref(null)
const failedKinds: Ref<AccountPhotoKind[]> = ref([])

const sortedPhotos: ComputedRef<AccountPhoto[]> = computed(() =>
  [...props.photos].sort(
    (first, second) =>
      ACCOUNT_PHOTO_KINDS.indexOf(first.kind) - ACCOUNT_PHOTO_KINDS.indexOf(second.kind),
  ),
)

const kindLabel = (photo: AccountPhoto): string => t(`account.photos.kinds.${photo.kind}`)

const altFor = (photo: AccountPhoto): string =>
  t(`account.photos.alt.${photo.kind}`, { date: props.dateLabel })

const enlargeLabel = (photo: AccountPhoto): string =>
  t('account.photos.enlarge', { kind: kindLabel(photo), date: props.dateLabel })

const dialogLabel = (photo: AccountPhoto): string =>
  t('account.photos.dialogLabel', { kind: kindLabel(photo), date: props.dateLabel })

const markFailed = (kind: AccountPhotoKind): void => {
  if (!failedKinds.value.includes(kind)) {
    failedKinds.value = [...failedKinds.value, kind]
  }
}

const openPhoto = async (photo: AccountPhoto): Promise<void> => {
  selectedPhoto.value = photo
  await nextTick()
  dialogRef.value?.showModal()
}

const closePhoto = (): void => {
  dialogRef.value?.close()
}
</script>
