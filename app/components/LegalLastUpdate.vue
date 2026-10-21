<template>
  <p>
    {{ label }}
    <time :datetime="LEGAL_PAGES_UPDATED_ON">{{ formattedDate }}</time>
  </p>
</template>

<script setup lang="ts">
import { LEGAL_PAGES_UPDATED_ON } from '@/constants/legal'
import { formatMediumDate } from '@/utils/date'

defineProps<{
  label: string
}>()

const { locale } = useI18n()

const formattedDate = computed((): string => formatMediumDate(LEGAL_PAGES_UPDATED_ON, locale.value))
</script>
