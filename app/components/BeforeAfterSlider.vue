<template>
  <div
    :style="splitStyle"
    class="group relative aspect-[686/330] select-none overflow-hidden rounded-3xl ring-1 ring-white/10 transition-shadow duration-press ease-brand has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-turquoise motion-reduce:transition-none"
  >
    <NuxtImg
      :src="props.after.src"
      :alt="props.after.alt"
      :width="props.width"
      :height="props.height"
      :loading="loading"
      :fetchpriority="fetchPriority"
      sizes="100vw lg:620px"
      format="webp"
      class="absolute inset-0 h-full w-full object-cover"
    />
    <div class="absolute inset-0 [clip-path:inset(0_var(--split-rest)_0_0)]">
      <NuxtImg
        :src="props.before.src"
        :alt="props.before.alt"
        :width="props.width"
        :height="props.height"
        :loading="loading"
        :fetchpriority="fetchPriority"
        sizes="100vw lg:620px"
        format="webp"
        class="h-full w-full object-cover"
      />
    </div>
    <span
      aria-hidden="true"
      class="absolute left-4 top-4 rounded-full bg-navy-950/80 px-3 py-1 text-xs font-bold text-white"
    >
      {{ $t('home.beforeAfter.before') }}
    </span>
    <span
      aria-hidden="true"
      class="absolute right-4 top-4 rounded-full bg-turquoise px-3 py-1 text-xs font-bold text-navy-950"
    >
      {{ $t('home.beforeAfter.after') }}
    </span>
    <input
      v-model.number="position"
      type="range"
      min="0"
      max="100"
      step="1"
      :aria-label="$t('home.beforeAfter.rangeLabel')"
      :aria-valuetext="$t('home.beforeAfter.valueText', { value: position })"
      class="absolute inset-0 z-10 h-full w-full cursor-ew-resize touch-pan-y opacity-0 focus-visible:outline-none"
    />
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 left-(--split) w-0.5 -translate-x-1/2 bg-white shadow-lg shadow-navy-950/50"
    >
      <span
        class="absolute left-1/2 top-1/2 grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-navy-950 shadow-lg shadow-navy-950/50 ring-1 ring-navy-950/20 transition-[scale] duration-press ease-brand group-has-[:focus-visible]:scale-110 motion-reduce:transition-none motion-reduce:group-has-[:focus-visible]:scale-100"
      >
        <Icon name="MoveHorizontal" :size="20" />
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BeforeAfterImage } from '@/types/home'

type ImageLoading = 'eager' | 'lazy'

type ImageFetchPriority = 'high' | undefined

const props = withDefaults(
  defineProps<{
    before: BeforeAfterImage
    after: BeforeAfterImage
    width: number
    height: number
    isPriority?: boolean
    initialPosition?: number
  }>(),
  {
    isPriority: false,
    initialPosition: 50,
  },
)

const position: Ref<number> = ref(props.initialPosition)

const loading: ComputedRef<ImageLoading> = computed(() => (props.isPriority ? 'eager' : 'lazy'))

const fetchPriority: ComputedRef<ImageFetchPriority> = computed(() =>
  props.isPriority ? 'high' : undefined,
)

const splitStyle: ComputedRef<Record<string, string>> = computed(() => ({
  '--split': `${position.value}%`,
  '--split-rest': `${100 - position.value}%`,
}))
</script>
