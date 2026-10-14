<template>
  <svg viewBox="0 0 32 42" aria-hidden="true" class="h-10 w-8 shrink-0">
    <rect x="12" y="1" width="8" height="3" rx="1" class="fill-slate-700" />
    <rect x="3" y="4" width="26" height="6" rx="1.5" :class="props.lidClass" />
    <path d="M5 11h22l-2 25H7z" class="fill-slate-700" />
    <path d="M11 15v17M16 15v17M21 15v17" class="stroke-slate-500" stroke-width="1.5" />
    <circle cx="9" cy="38" r="3" class="fill-slate-900" />
    <circle cx="23" cy="38" r="3" class="fill-slate-900" />
  </svg>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    lidClass?: string
  }>(),
  {
    lidClass: 'fill-slate-500',
  },
)
</script>
