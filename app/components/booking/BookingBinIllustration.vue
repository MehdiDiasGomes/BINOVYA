<template>
  <svg
    v-if="props.service === 'small-bin'"
    viewBox="0 0 120 140"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="30" y="6" width="60" height="7" rx="3.5" class="fill-navy-900" />
    <path d="M14 20q0-7 7-7h78q7 0 7 7v8q0 4-4 4H18q-4 0-4-4z" class="fill-turquoise" />
    <path d="M40 15h40v6q0 2-2 2H42q-2 0-2-2z" class="fill-turquoise-deep" />
    <path d="M20 32h80l-6 88q-.5 6-6.5 6h-55q-6 0-6.5-6z" class="fill-navy-800" />
    <path d="M20 32h80l-.6 9H20.6z" class="fill-navy-900" />
    <path
      d="M44 50v58M60 50v60M76 50v58"
      fill="none"
      stroke-width="4"
      stroke-linecap="round"
      class="stroke-line"
    />
    <path
      d="M27 44l5 74"
      fill="none"
      stroke-width="5"
      stroke-linecap="round"
      class="stroke-white/12"
    />
    <rect x="18" y="118" width="22" height="6" rx="3" class="fill-navy-900" />
    <circle cx="29" cy="126" r="10" stroke-width="3" class="fill-navy-950 stroke-line" />
    <circle cx="29" cy="126" r="4.5" class="fill-muted-foreground" />
  </svg>
  <svg v-else viewBox="0 0 160 140" aria-hidden="true" focusable="false">
    <path
      d="M10 28q0-10 12-14q58-12 116 0q12 4 12 14v6q0 3-3 3H13q-3 0-3-3z"
      class="fill-turquoise"
    />
    <path
      d="M30 22q50-8 100 0"
      fill="none"
      stroke-width="4"
      stroke-linecap="round"
      class="stroke-turquoise-deep"
    />
    <rect x="64" y="17" width="32" height="7" rx="3.5" class="fill-turquoise-deep" />
    <path d="M14 37h132l-5 70q-.5 6-6.5 6H25.5q-6 0-6.5-6z" class="fill-navy-800" />
    <path d="M14 37h132l-.6 8H14.6z" class="fill-navy-900" />
    <rect x="3" y="44" width="13" height="8" rx="4" class="fill-navy-900" />
    <rect x="144" y="44" width="13" height="8" rx="4" class="fill-navy-900" />
    <path
      d="M40 56v44M60 56v46M80 56v46M100 56v46M120 56v44"
      fill="none"
      stroke-width="4"
      stroke-linecap="round"
      class="stroke-line"
    />
    <path
      d="M22 50l4 54"
      fill="none"
      stroke-width="5"
      stroke-linecap="round"
      class="stroke-white/12"
    />
    <path d="M24 113h12l-3 9h-6zM124 113h12l-3 9h-6z" class="fill-line" />
    <circle cx="30" cy="127" r="8" stroke-width="3" class="fill-navy-950 stroke-line" />
    <circle cx="30" cy="127" r="3.2" class="fill-muted-foreground" />
    <circle cx="130" cy="127" r="8" stroke-width="3" class="fill-navy-950 stroke-line" />
    <circle cx="130" cy="127" r="3.2" class="fill-muted-foreground" />
  </svg>
</template>

<script setup lang="ts">
import type { ServiceSlug } from '@/types/booking'

const props = defineProps<{
  service: ServiceSlug
}>()
</script>
