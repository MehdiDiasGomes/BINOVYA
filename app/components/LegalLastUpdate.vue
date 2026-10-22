<template>
  <I18nT keypath="common.lastUpdate" tag="p" scope="global">
    <template #date>
      <time :datetime="props.date">{{ formattedDate }}</time>
    </template>
  </I18nT>
</template>

<script setup lang="ts">
import { formatMediumDate } from '@/utils/date'

const props = defineProps<{
  date: string
}>()

const { locale } = useI18n()

const formattedDate: ComputedRef<string> = computed((): string =>
  formatMediumDate(props.date, locale.value),
)
</script>
