<template>
  <div class="border-b border-border bg-paper-2 py-5">
    <div
      class="mx-auto flex max-w-[1180px] flex-wrap items-center justify-center gap-8 px-8 sm:gap-16"
    >
      <div v-for="trust in trustItems" :key="trust.key" class="flex items-center gap-2.5">
        <Icon :name="trust.icon" class="h-5 w-5 text-primary" aria-hidden="true" />
        <span class="text-sm font-bold text-ink">{{ $t(trust.labelKey) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LucideIconName } from '@/constants/clients'

type TrustItem = {
  key: string
  icon: LucideIconName
  labelKey: string
}

const trustItems: TrustItem[] = [
  { key: 'fast', icon: 'Zap', labelKey: 'trust.fast' },
  { key: 'flexible', icon: 'Calendar', labelKey: 'trust.flexible' },
  { key: 'payment', icon: 'ShieldCheck', labelKey: 'trust.payment' },
]
</script>
