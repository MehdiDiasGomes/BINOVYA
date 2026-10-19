<template>
  <div class="rounded-2xl border border-border bg-white p-4 shadow-sm">
    <div class="flex items-center gap-4">
      <div
        :class="
          cn(
            'relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 bg-paper-2 text-ink/70 transition-colors duration-press ease-brand motion-reduce:transition-none',
            hasPhoto ? 'border-border' : 'border-dashed border-ink/50',
          )
        "
      >
        <Icon
          :name="hasPhoto ? 'Image' : 'Camera'"
          :size="24"
          aria-hidden="true"
          class="shrink-0"
        />
        <AnimatePresence :initial="false">
          <Motion
            v-if="preview"
            key="preview"
            as="img"
            :src="preview"
            :alt="$t('pro.photos.previewAlt', { kind: kindLabel })"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 1 }"
            :transition="CONTENT_ENTER_TRANSITION"
            class="absolute inset-0 size-full object-cover"
          />
        </AnimatePresence>
      </div>
      <div class="min-w-0 flex-1">
        <p class="font-heading text-base font-bold text-ink">{{ kindLabel }}</p>
        <p class="mt-0.5 flex items-center gap-1.5 text-sm text-ink/80">
          <Icon
            :name="hasPhoto ? 'CircleCheck' : 'CircleDashed'"
            :size="14"
            aria-hidden="true"
            class="shrink-0"
          />
          {{ hasPhoto ? $t('pro.photos.added') : $t('pro.photos.missing') }}
        </p>
      </div>
    </div>
    <AppButton
      :variant="hasPhoto ? 'secondary' : 'primary'"
      icon="Camera"
      :is-loading="isBusy"
      :is-disabled="isLocked"
      :aria-describedby="describedByIds(slotId, '', errorMessage)"
      class="mt-4 w-full"
      @click="pick"
    >
      {{ actionLabel }}
      <span v-if="!isBusy" class="sr-only">{{
        $t(`pro.photos.kindContext.${props.kind}`, { context: props.context })
      }}</span>
    </AppButton>
    <AnimatePresence :initial="false">
      <Motion
        v-if="errorMessage"
        :id="`${slotId}-error`"
        key="error"
        as="p"
        :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0 }"
        :transition="STEP_TRANSITION"
        class="mt-3 flex items-start gap-2 break-words text-sm font-bold text-red-700"
      >
        <Icon name="CircleAlert" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
        {{ errorMessage }}
      </Motion>
    </AnimatePresence>
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      hidden
      :aria-label="$t('pro.photos.fileLabel')"
      @change="handleFile"
    />
  </div>
</template>

<script setup lang="ts">
import type { ProPhotoKind } from '@/types/pro'
import type { ProPhotoUploadState } from '@/types/proPhotoUpload'

import { CONTENT_ENTER_TRANSITION, FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'
import { describedByIds } from '@/utils/field'

const props = withDefaults(
  defineProps<{
    kind: ProPhotoKind
    upload: ProPhotoUploadState
    context?: string
  }>(),
  {
    context: '',
  },
)

const { t } = useI18n()

const slotId: string = useId()

const fileInputRef: Ref<HTMLInputElement | null> = ref(null)

const kindLabel: ComputedRef<string> = computed(() => t(`pro.photos.kinds.${props.kind}`))

const hasPhoto: ComputedRef<boolean> = computed(() => props.upload.photos.value[props.kind])

const preview: ComputedRef<string> = computed(() => props.upload.previews.value[props.kind])

const isBusy: ComputedRef<boolean> = computed(() => props.upload.busyKind.value === props.kind)

const isLocked: ComputedRef<boolean> = computed(
  () => props.upload.busyKind.value !== null && !isBusy.value,
)

const errorMessage: ComputedRef<string> = computed(() =>
  props.upload.errorKind.value === props.kind ? props.upload.errorMessage.value : '',
)

const actionLabel: ComputedRef<string> = computed(() => {
  if (isBusy.value) {
    return props.upload.phase.value === 'preparing'
      ? t('pro.photos.preparing')
      : t('pro.photos.uploading')
  }
  return hasPhoto.value ? t('pro.photos.replace') : t('pro.photos.add')
})

const pick = (): void => {
  if (props.upload.busyKind.value || !fileInputRef.value) {
    return
  }
  fileInputRef.value.value = ''
  fileInputRef.value.click()
}

const handleFile = async (event: Event): Promise<void> => {
  const input: EventTarget | null = event.target
  const file: File | undefined =
    input instanceof HTMLInputElement ? (input.files?.[0] ?? undefined) : undefined
  if (file) {
    await props.upload.upload(props.kind, file)
  }
}
</script>
