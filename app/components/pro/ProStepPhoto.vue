<template>
  <div class="space-y-5">
    <p class="text-[15px] text-ink/80">{{ $t(`pro.steps.photo.text.${props.kind}`) }}</p>
    <ProPhotoSlot :kind="props.kind" :upload="props.upload" :context="props.context" />
    <div class="grid gap-3">
      <AppButton
        trailing-icon="ArrowRight"
        :is-disabled="!hasPhoto"
        :aria-describedby="hasPhoto ? undefined : hintId"
        class="w-full"
        @click="emit('next')"
      >
        {{ $t('pro.steps.next') }}
      </AppButton>
      <AnimatePresence :initial="false">
        <Motion
          v-if="!hasPhoto"
          key="skip"
          as="div"
          :initial="{ opacity: 0, y: -FEEDBACK_OFFSET }"
          :animate="{ opacity: 1, y: 0 }"
          :exit="{ opacity: 0 }"
          :transition="STEP_TRANSITION"
          class="grid gap-3"
        >
          <p :id="hintId" class="flex items-start gap-2 text-sm text-ink/80">
            <Icon name="Info" :size="16" aria-hidden="true" class="mt-0.5 shrink-0" />
            {{ $t('pro.steps.photo.continueHint') }}
          </p>
          <AppButton
            variant="secondary"
            :aria-describedby="skipHintId"
            class="w-full"
            @click="emit('next')"
          >
            {{ $t('pro.steps.skip') }}
          </AppButton>
          <p :id="skipHintId" class="text-sm text-ink/80">
            {{ $t('pro.steps.photo.skipHint') }}
          </p>
        </Motion>
      </AnimatePresence>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProPhotoKind } from '@/types/pro'
import type { ProPhotoUploadState } from '@/types/proPhotoUpload'

import { FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'

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

const emit = defineEmits<{
  next: []
}>()

const hintId: string = useId()

const skipHintId: string = useId()

const hasPhoto: ComputedRef<boolean> = computed(() => props.upload.photos.value[props.kind])
</script>
