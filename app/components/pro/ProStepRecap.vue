<template>
  <div class="space-y-5">
    <p class="text-[15px] text-ink/80">
      {{ props.isCompleted ? $t('pro.steps.completed.recapText') : $t('pro.steps.recap.text') }}
    </p>
    <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <li v-for="kind in PHOTO_KINDS" :key="kind">
        <ProPhotoSlot :kind="kind" :upload="props.upload" :context="props.context" />
      </li>
    </ul>
    <p
      v-if="props.isCompleted && props.intervention.completedWithoutPhotos"
      class="flex items-start gap-2 text-sm text-ink/80"
    >
      <Icon name="Info" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
      {{ $t('pro.complete.completedWithoutPhotos') }}
    </p>
    <template v-if="!props.isCompleted">
      <AnimatePresence :initial="false">
        <Motion
          v-if="missingKinds.length > 0"
          key="missing"
          as="p"
          :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="STEP_TRANSITION"
          class="flex items-start gap-2.5 rounded-xl border border-amber-500 bg-amber-50 p-4 text-sm font-bold text-navy-950"
        >
          <Icon
            name="TriangleAlert"
            :size="18"
            aria-hidden="true"
            class="mt-px shrink-0 text-amber-700"
          />
          {{ $t('pro.steps.recap.missing', { missing: missingPhotosLabel(missingKinds, t) }) }}
        </Motion>
      </AnimatePresence>
      <AppButton
        aria-haspopup="dialog"
        icon="CircleCheck"
        :is-disabled="isUploading"
        :aria-describedby="isUploading ? uploadingHintId : undefined"
        class="w-full"
        @click="requestComplete"
      >
        {{ $t('pro.complete.action') }}
      </AppButton>
      <AnimatePresence :initial="false">
        <Motion
          v-if="isUploading"
          :id="uploadingHintId"
          key="uploading"
          as="p"
          :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="STEP_TRANSITION"
          class="flex items-start gap-2 text-sm text-ink/80"
        >
          <Icon name="Info" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
          {{ $t('pro.steps.recap.uploading') }}
        </Motion>
      </AnimatePresence>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ProIntervention, ProPhotoKind } from '@/types/pro'
import type { ProPhotoUploadState } from '@/types/proPhotoUpload'

import { FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { PHOTO_KINDS } from '@/constants/photos'
import { missingPhotoKinds, missingPhotosLabel } from '@/utils/proPhotos'

const props = withDefaults(
  defineProps<{
    intervention: ProIntervention
    upload: ProPhotoUploadState
    context?: string
    isCompleted?: boolean
  }>(),
  {
    context: '',
    isCompleted: false,
  },
)

const emit = defineEmits<{
  complete: [trigger: HTMLElement | null]
}>()

const { t } = useI18n()

const uploadingHintId: string = useId()

const missingKinds: ComputedRef<ProPhotoKind[]> = computed(() =>
  missingPhotoKinds(props.upload.photos.value),
)

const isUploading: ComputedRef<boolean> = computed(() => props.upload.busyKind.value !== null)

const requestComplete = (event: MouseEvent): void => {
  emit('complete', event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
}
</script>
