<template>
  <div class="space-y-5">
    <p
      class="flex items-center gap-3 break-words rounded-2xl border border-border bg-white p-4 text-[15px] shadow-sm"
    >
      <span
        aria-hidden="true"
        class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Icon name="Trash2" :size="20" />
      </span>
      <span class="min-w-0 flex-1">
        <span class="block text-sm text-ink/80">{{ $t('pro.steps.photo.toClean') }}</span>
        <span class="font-semibold text-ink">{{ binsLabel }}</span>
      </span>
    </p>
    <p class="text-[15px] text-ink/80">{{ $t(`pro.steps.photo.text.${props.kind}`) }}</p>
    <ProPhotoSlot :kind="props.kind" :upload="props.upload" :context="props.context" />
    <Motion
      v-if="hasPhoto"
      as="div"
      :initial="swapInitial"
      :animate="{ opacity: 1, y: 0 }"
      :transition="STEP_TRANSITION"
    >
      <AppButton ref="continueRef" trailing-icon="ArrowRight" class="w-full" @click="emit('next')">
        {{ $t(`pro.steps.next.${props.kind}`) }}
      </AppButton>
    </Motion>
    <Motion
      v-else-if="isSkipOpen"
      as="div"
      :initial="swapInitial"
      :animate="{ opacity: 1, y: 0 }"
      :transition="STEP_TRANSITION"
    >
      <div
        ref="confirmRef"
        role="group"
        :aria-labelledby="confirmTextId"
        class="grid gap-3 rounded-xl border border-amber-500 bg-amber-50 p-4"
      >
        <p
          :id="confirmTextId"
          ref="confirmTextRef"
          tabindex="-1"
          class="flex items-start gap-2.5 text-sm font-bold text-navy-950 outline-none"
        >
          <Icon
            name="TriangleAlert"
            :size="18"
            aria-hidden="true"
            class="mt-px shrink-0 text-amber-700"
          />
          {{ $t('pro.steps.photo.skipWarning') }}
        </p>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <AppButton variant="warning" class="w-full" @click="emit('next')">
            {{ $t('pro.steps.photo.skipConfirm') }}
          </AppButton>
          <AppButton variant="secondary" class="w-full" @click="cancelSkip">
            {{ $t('pro.steps.photo.skipCancel') }}
          </AppButton>
        </div>
      </div>
    </Motion>
    <Motion
      v-else
      as="div"
      :initial="swapInitial"
      :animate="{ opacity: 1, y: 0 }"
      :transition="STEP_TRANSITION"
      class="flex justify-center"
    >
      <button
        ref="skipRef"
        type="button"
        :class="cn(TEXT_LINK_CLASS, 'cursor-pointer text-sm font-bold')"
        @click="openSkip"
      >
        {{ $t('pro.steps.skip') }}
      </button>
    </Motion>
  </div>
</template>

<script setup lang="ts">
import type { FocusTarget } from '@/types/button'
import type { ProIntervention, ProPhotoKind } from '@/types/pro'
import type { ProPhotoUploadState } from '@/types/proPhotoUpload'

import { TEXT_LINK_CLASS } from '@/constants/buttons'
import { FEEDBACK_OFFSET, STEP_TRANSITION } from '@/constants/motion'
import { cn } from '@/lib/utils'
import { bookingServicesLabel } from '@/utils/accountBookingCard'

const props = withDefaults(
  defineProps<{
    intervention: ProIntervention
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

const { t } = useI18n()

const confirmTextId: string = useId()

const isSkipOpen: Ref<boolean> = ref(false)
const skipRef: Ref<HTMLButtonElement | null> = ref(null)
const confirmRef: Ref<HTMLElement | null> = ref(null)
const confirmTextRef: Ref<HTMLElement | null> = ref(null)
const continueRef: Ref<FocusTarget | null> = ref(null)
const hasSwapped: Ref<boolean> = ref(false)

const hasPhoto: ComputedRef<boolean> = computed(() => props.upload.photos.value[props.kind])

const swapInitial: ComputedRef<{ opacity: number; y: number } | false> = computed(() =>
  hasSwapped.value ? { opacity: 0, y: FEEDBACK_OFFSET } : false,
)

const binsLabel: ComputedRef<string> = computed(() => bookingServicesLabel(props.intervention, t))

const openSkip = async (): Promise<void> => {
  hasSwapped.value = true
  isSkipOpen.value = true
  await nextTick()
  confirmTextRef.value?.focus()
}

const cancelSkip = async (): Promise<void> => {
  hasSwapped.value = true
  isSkipOpen.value = false
  await nextTick()
  skipRef.value?.focus()
}

watch(hasPhoto, async (isTaken: boolean): Promise<void> => {
  hasSwapped.value = true
  if (!isTaken) {
    return
  }
  const active: Element | null = document.activeElement
  const hadFocus: boolean =
    Boolean(confirmRef.value?.contains(active)) || (active !== null && active === skipRef.value)
  isSkipOpen.value = false
  await nextTick()
  if (hadFocus) {
    continueRef.value?.focus()
  }
})
</script>
