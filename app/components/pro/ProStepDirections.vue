<template>
  <div class="space-y-5">
    <p class="text-[15px] text-ink/80">{{ $t('pro.steps.directions.text') }}</p>
    <p
      class="flex items-start gap-3 break-words rounded-2xl border border-border bg-white p-4 text-[15px] font-semibold text-ink shadow-sm"
    >
      <Icon name="MapPin" :size="20" aria-hidden="true" class="shrink-0 text-primary" />
      <span class="min-w-0 flex-1">{{ props.intervention.address }}</span>
    </p>
    <div class="grid gap-3">
      <ProDirectionsMenu :stop="props.intervention" :context="props.context" />
      <AppButton
        v-if="props.intervention.customer?.phone"
        :href="telHref(props.intervention.customer.phone)"
        variant="secondary"
        icon="Phone"
        class="w-full"
      >
        {{ $t('pro.steps.directions.call', { phone: props.intervention.customer.phone }) }}
      </AppButton>
    </div>
    <AppButton trailing-icon="ArrowRight" class="w-full" @click="emit('next')">
      {{ $t('pro.steps.next') }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import type { ProIntervention } from '@/types/pro'

import { telHref } from '@/utils/phone'

const props = withDefaults(
  defineProps<{
    intervention: ProIntervention
    context?: string
  }>(),
  {
    context: '',
  },
)

const emit = defineEmits<{
  next: []
}>()
</script>
