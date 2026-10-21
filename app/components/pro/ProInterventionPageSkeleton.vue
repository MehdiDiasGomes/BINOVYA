<template>
  <div aria-hidden="true" class="space-y-6">
    <div>
      <div class="flex h-lh items-center text-sm">
        <SkeletonBlock class="h-3.5 w-28" />
      </div>
      <div class="mt-1 grid grid-cols-4 gap-1.5">
        <div v-for="step in PRO_STEPS.length" :key="step" :class="PRO_STEP_SEGMENT_CLASS">
          <SkeletonBlock :class="PRO_STEP_BAR_CLASS" />
        </div>
      </div>
    </div>
    <div>
      <div class="mb-4 flex h-lh items-center text-[22px]">
        <SkeletonBlock class="h-5 w-40" />
      </div>
      <div class="space-y-5">
        <div class="rounded-2xl border border-border bg-white p-4 text-[15px] shadow-sm">
          <div class="flex items-center gap-3">
            <SkeletonBlock class="size-10 shrink-0 rounded-full" />
            <div class="flex h-lh min-w-0 flex-1 items-center">
              <SkeletonBlock class="h-3.5 w-4/5" />
            </div>
          </div>
          <div class="mt-4 flex gap-3 border-t border-border pt-4">
            <SkeletonBlock class="h-12 min-w-0 flex-1 rounded-lg" />
            <SkeletonBlock class="size-12 shrink-0 rounded-lg" />
          </div>
        </div>
        <SkeletonBlock class="h-12 w-full rounded-lg" />
      </div>
    </div>
    <div class="rounded-2xl border border-border bg-white shadow-sm">
      <div class="flex min-h-12 items-center px-5 py-3 text-lg">
        <div class="flex h-lh items-center">
          <SkeletonBlock class="h-4 w-32" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRO_STEP_BAR_CLASS, PRO_STEP_SEGMENT_CLASS, PRO_STEPS } from '@/constants/proSteps'
</script>
