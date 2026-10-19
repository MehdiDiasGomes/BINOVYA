<template>
  <div class="space-y-6">
    <ProInterventionSteps :steps="steps" :current-step="currentStep" />
    <section :aria-labelledby="headingId">
      <h2
        :id="headingId"
        ref="titleRef"
        tabindex="-1"
        class="mb-4 text-[22px] font-black text-ink outline-none"
      >
        <span class="sr-only">
          {{ $t('pro.steps.headingPrefix', { current: currentStep, total: steps.length }) }}
        </span>
        {{ $t(`pro.steps.names.${currentId}`) }}
      </h2>
      <AnimatePresence mode="wait" :initial="false">
        <Motion
          :key="currentId"
          :initial="{ opacity: 0, y: STEP_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="STEP_TRANSITION"
        >
          <ProStepDirections
            v-if="currentId === 'directions'"
            :intervention="props.intervention"
            :context="props.context"
            @next="goToStep(currentStep + 1)"
          />
          <ProStepPhoto
            v-else-if="currentKind"
            :key="currentKind"
            :intervention="props.intervention"
            :kind="currentKind"
            :upload="props.upload"
            :context="props.context"
            @next="goToStep(currentStep + 1)"
          />
          <ProStepRecap
            v-else
            :intervention="props.intervention"
            :upload="props.upload"
            :context="props.context"
            @complete="emit('complete', $event)"
          />
        </Motion>
      </AnimatePresence>
    </section>
    <AnimatePresence :initial="false">
      <Motion
        v-if="offScreenErrorKind"
        key="photo-error"
        :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
        :animate="{ opacity: 1, y: 0 }"
        :exit="{ opacity: 0 }"
        :transition="STEP_TRANSITION"
        class="rounded-2xl border border-destructive/50 bg-destructive/5 p-4 text-sm text-red-700"
      >
        <p class="flex items-start gap-2 break-words font-bold">
          <Icon name="CircleAlert" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
          {{ props.upload.errorMessage.value }}
        </p>
        <NuxtLink
          :to="stepRoute(photoStepNumber(offScreenErrorKind))"
          class="mt-1 inline-flex min-h-11 items-center rounded-sm font-bold underline underline-offset-4 transition-colors duration-press ease-brand hover:text-red-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-destructive focus-visible:ring-offset-2 motion-reduce:transition-none"
        >
          {{
            $t('pro.steps.photoError.link', {
              name: $t(`pro.steps.names.${offScreenErrorKind}`),
            })
          }}
        </NuxtLink>
      </Motion>
    </AnimatePresence>
  </div>
</template>

<script setup lang="ts">
import type { ProIntervention, ProPhotoKind } from '@/types/pro'
import type { ProPhotoUploadState } from '@/types/proPhotoUpload'

import { FEEDBACK_OFFSET, STEP_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { PRO_STEP_PHOTO_KINDS } from '@/constants/proSteps'
import { initialInterventionStep, photoStepNumber } from '@/utils/proSteps'

const props = withDefaults(
  defineProps<{
    intervention: ProIntervention
    upload: ProPhotoUploadState
    context?: string
  }>(),
  {
    context: '',
  },
)

const emit = defineEmits<{
  complete: [trigger: HTMLElement | null]
  announce: [notice: string]
}>()

const headingId: string = useId()

const { currentStep, currentId, steps, titleRef, stepRoute, goToStep } = useProInterventionSteps({
  photos: () => props.upload.photos.value,
  initialStep: () => initialInterventionStep(props.intervention.photos),
  onStepChange: (notice: string): void => emit('announce', notice),
})

const currentKind: ComputedRef<ProPhotoKind | undefined> = computed(
  () => PRO_STEP_PHOTO_KINDS[currentId.value],
)

const offScreenErrorKind: ComputedRef<ProPhotoKind | null> = computed(() => {
  const kind: ProPhotoKind | null = props.upload.errorKind.value
  if (!kind || !props.upload.errorMessage.value || currentId.value === 'recap') {
    return null
  }
  return kind === currentKind.value ? null : kind
})

defineExpose({ titleRef })
</script>
