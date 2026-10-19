<template>
  <div aria-hidden="true" class="space-y-6">
    <div>
      <div class="flex h-lh items-center text-sm">
        <SkeletonBlock class="h-3.5 w-28" />
      </div>
      <div class="mt-3 grid grid-cols-4 gap-2">
        <SkeletonBlock v-for="step in PRO_STEPS.length" :key="step" class="h-22 rounded-xl" />
      </div>
    </div>
    <div>
      <div class="mb-4 flex h-lh items-center text-[22px]">
        <SkeletonBlock class="h-5 w-40" />
      </div>
      <div class="space-y-5">
        <div class="text-[15px]">
          <div class="flex h-lh items-center">
            <SkeletonBlock class="h-3.5 w-full" />
          </div>
          <div class="flex h-lh items-center">
            <SkeletonBlock class="h-3.5 w-full" />
          </div>
          <div class="flex h-lh items-center">
            <SkeletonBlock class="h-3.5 w-2/3" />
          </div>
        </div>
        <div class="rounded-2xl border border-border bg-white p-4 text-[15px] shadow-sm">
          <div class="flex h-lh items-center">
            <SkeletonBlock class="h-3.5 w-4/5" />
          </div>
        </div>
        <div class="grid gap-3">
          <SkeletonBlock class="h-12 w-full rounded-lg" />
          <SkeletonBlock class="h-12 w-full rounded-lg" />
        </div>
        <SkeletonBlock class="h-12 w-full rounded-lg" />
      </div>
    </div>
    <div class="rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div class="flex h-lh items-center text-lg">
        <SkeletonBlock class="h-4 w-48" />
      </div>
      <div class="mt-3 grid gap-2 text-[15px]">
        <div v-for="row in 8" :key="row" :class="DETAIL_ROW_CLASS">
          <div class="flex h-lh items-center">
            <SkeletonBlock class="h-3.5 w-20" />
          </div>
          <div :class="cn('flex items-center', row === 1 ? 'min-h-11' : 'h-lh')">
            <SkeletonBlock class="h-3.5 w-32" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { DETAIL_ROW_CLASS } from '@/constants/mediaCard'
import { PRO_STEPS } from '@/constants/proSteps'
import { cn } from '@/lib/utils'
</script>
