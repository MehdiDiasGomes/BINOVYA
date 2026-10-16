<template>
  <article
    :aria-labelledby="titleId"
    :class="
      cn(
        MEDIA_CARD_SHELL_CLASS,
        'text-white',
        props.interactive &&
          'transition-[translate,box-shadow] duration-lift ease-brand hover:-translate-y-[3px] hover:shadow-2xl hover:shadow-navy-950/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0',
        props.image && 'pt-0',
        toneClasses.surface,
      )
    "
  >
    <div
      aria-hidden="true"
      :class="
        cn(
          'pointer-events-none absolute inset-0 -z-10 bg-radial-[120%_70%_at_85%_0%] to-transparent to-60%',
          toneClasses.glow,
        )
      "
    />
    <div v-if="props.image" class="relative -mx-6 -mb-6">
      <NuxtImg
        :src="props.image.src"
        :alt="props.image.alt"
        loading="lazy"
        class="aspect-video w-full object-cover"
      />
      <div
        aria-hidden="true"
        class="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-navy-900 to-transparent"
      />
    </div>
    <div
      v-if="slots.eyebrow"
      :class="
        cn(
          'flex items-center gap-2 font-heading text-[13px] font-bold uppercase tracking-[0.1em]',
          toneClasses.eyebrow,
        )
      "
    >
      <slot name="eyebrow" />
    </div>
    <div>
      <component
        :is="props.titleTag"
        :id="titleId"
        class="text-balance font-heading text-2xl font-bold leading-[1.15]"
      >
        {{ props.title }}
      </component>
      <p v-if="props.subtitle" class="mt-1.5 break-words text-[15.5px] text-white/80">
        {{ props.subtitle }}
      </p>
    </div>
    <slot />
    <div v-if="slots.footer" class="mt-auto border-t border-white/15 pt-3.5">
      <slot name="footer" />
    </div>
    <div v-if="slots.action">
      <slot name="action" />
    </div>
  </article>
</template>

<script setup lang="ts">
import type {
  MediaCardImage,
  MediaCardTitleTag,
  MediaCardTone,
  MediaCardToneClasses,
} from '@/types/mediaCard'
import type { VNode } from 'vue'

import { MEDIA_CARD_SHELL_CLASS, MEDIA_CARD_TONES } from '@/constants/mediaCard'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    title: string
    tone?: MediaCardTone
    titleTag?: MediaCardTitleTag
    subtitle?: string
    image?: MediaCardImage | null
    interactive?: boolean
  }>(),
  {
    tone: 'info',
    titleTag: 'h3',
    subtitle: '',
    image: null,
    interactive: false,
  },
)

const slots = defineSlots<{
  eyebrow?: () => VNode[]
  default?: () => VNode[]
  footer?: () => VNode[]
  action?: () => VNode[]
}>()

const titleId: string = useId()

const toneClasses: ComputedRef<MediaCardToneClasses> = computed(() => MEDIA_CARD_TONES[props.tone])
</script>
