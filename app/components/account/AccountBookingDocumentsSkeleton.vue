<template>
  <div aria-hidden="true" class="space-y-8">
    <div>
      <div class="flex h-lh items-center text-[22px]">
        <SkeletonBlock class="h-5 w-40" />
      </div>
      <div class="mt-1.5 text-[15px]">
        <div class="flex h-lh items-center">
          <SkeletonBlock class="h-3.5 w-full" />
        </div>
        <div class="flex h-lh items-center sm:hidden">
          <SkeletonBlock class="h-3.5 w-1/2" />
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <div v-for="kind in PHOTO_KINDS" :key="kind">
          <div class="flex h-lh items-center font-heading text-sm">
            <SkeletonBlock class="h-3.5 w-16" />
          </div>
          <SkeletonBlock class="mt-2 aspect-[4/3] w-full rounded-3xl" />
        </div>
      </div>
    </div>
    <div>
      <div class="flex h-lh items-center text-[22px]">
        <SkeletonBlock class="h-5 w-28" />
      </div>
      <div class="mt-4 rounded-3xl border border-border bg-white px-5 py-4 shadow-sm">
        <SkeletonBlock class="h-12 w-full rounded-lg sm:w-56" />
        <div class="mt-3 text-sm">
          <div class="flex h-lh items-center">
            <SkeletonBlock class="h-3.5 w-full" />
          </div>
          <div class="flex h-lh items-center">
            <SkeletonBlock class="h-3.5 w-full sm:w-1/2" />
          </div>
          <div class="flex h-lh items-center sm:hidden">
            <SkeletonBlock class="h-3.5 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PHOTO_KINDS } from '@/constants/photos'
</script>
