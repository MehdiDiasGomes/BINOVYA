<template>
  <div aria-hidden="true" :class="cn(MEDIA_CARD_SHELL_CLASS, MEDIA_CARD_TONES.info.surface)">
    <div class="flex h-lh items-center gap-2 text-[13px]">
      <SkeletonBlock surface="dark" class="size-4 shrink-0 rounded-full" />
      <SkeletonBlock surface="dark" class="h-3 w-28" />
    </div>
    <div>
      <div class="flex h-lh items-center font-heading text-2xl leading-[1.15]">
        <SkeletonBlock surface="dark" class="h-5 w-3/4" />
      </div>
      <div v-if="props.hasSubtitle" class="mt-1.5 flex h-lh items-center text-[15.5px]">
        <SkeletonBlock surface="dark" class="h-3.5 w-2/3" />
      </div>
    </div>
    <div :class="cn('grid gap-1 text-[15px]', props.stackRows && 'gap-2')">
      <div
        v-for="row in props.detailRows"
        :key="row"
        :class="
          cn(
            'flex justify-between gap-3',
            props.stackRows ? 'flex-col gap-0.5 sm:flex-row sm:gap-3' : 'items-center',
          )
        "
      >
        <div class="flex h-lh items-center">
          <SkeletonBlock surface="dark" class="h-3.5 w-20" />
        </div>
        <div class="flex h-lh items-center">
          <SkeletonBlock surface="dark" class="h-3.5 w-32" />
        </div>
      </div>
    </div>
    <div class="mt-auto border-t border-white/15 pt-3.5">
      <div class="flex h-7 items-center justify-between gap-3">
        <SkeletonBlock surface="dark" class="h-3.5 w-24" />
        <SkeletonBlock surface="dark" class="h-5 w-16" />
      </div>
    </div>
    <SkeletonBlock v-if="props.hasAction" surface="dark" class="h-13 w-full rounded-full" />
  </div>
</template>

<script setup lang="ts">
import { MEDIA_CARD_SHELL_CLASS, MEDIA_CARD_TONES } from '@/constants/mediaCard'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    detailRows?: number
    hasSubtitle?: boolean
    stackRows?: boolean
    hasAction?: boolean
  }>(),
  {
    detailRows: 2,
    hasSubtitle: true,
    stackRows: false,
    hasAction: true,
  },
)
</script>
