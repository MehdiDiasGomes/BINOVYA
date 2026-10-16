<template>
  <div aria-hidden="true" class="space-y-8">
    <div>
      <div class="flex h-lh items-center text-[22px]">
        <SkeletonBlock class="h-5 w-40" />
      </div>
      <div class="mt-1.5 flex h-lh items-center text-[15px]">
        <SkeletonBlock class="h-3.5 w-4/5" />
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <div v-for="kind in ACCOUNT_PHOTO_KINDS" :key="kind">
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
      <SkeletonBlock class="mt-4 h-16 w-full rounded-3xl" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ACCOUNT_PHOTO_KINDS } from '@/constants/account'
</script>
