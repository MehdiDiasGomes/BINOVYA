<template>
  <div class="space-y-5">
    <div class="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p class="flex items-center gap-3 break-words text-[15px] font-semibold text-ink">
        <span
          aria-hidden="true"
          class="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
        >
          <Icon name="MapPin" :size="20" />
        </span>
        <span class="min-w-0 flex-1">
          <span class="sr-only">{{ $t('pro.steps.directions.addressLabel') }}</span>
          {{ props.intervention.address }}
        </span>
      </p>
      <div class="mt-4 flex gap-3 border-t border-border pt-4">
        <ProDirectionsMenu
          :stop="props.intervention"
          :context="props.context"
          trigger-class="min-w-0 flex-1 px-4"
        />
        <AppButton
          v-if="phone"
          :href="telHref(phone)"
          variant="secondary"
          icon="Phone"
          class="size-12 shrink-0 px-0"
        >
          <span class="sr-only">{{
            $t('pro.steps.directions.call', { name: customerName, phone: groupPhoneDigits(phone) })
          }}</span>
        </AppButton>
      </div>
    </div>
    <AppButton trailing-icon="ArrowRight" class="w-full" @click="emit('next')">
      {{ $t('pro.steps.directions.arrived') }}
    </AppButton>
  </div>
</template>

<script setup lang="ts">
import type { ProIntervention } from '@/types/pro'

import { groupPhoneDigits, telHref } from '@/utils/phone'
import { proCustomerName } from '@/utils/proIntervention'

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

const { t } = useI18n()

const phone: ComputedRef<string> = computed(() => props.intervention.customer?.phone ?? '')

const customerName: ComputedRef<string> = computed(() =>
  proCustomerName(props.intervention.customer, t),
)
</script>
