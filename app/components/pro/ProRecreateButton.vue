<template>
  <AppButton
    v-if="route"
    :to="localePath(route)"
    variant="secondary"
    icon="RotateCcw"
    class="mt-4 w-full sm:w-auto"
  >
    {{ $t('pro.card.recreate') }}
  </AppButton>
</template>

<script setup lang="ts">
import type { ProIntervention } from '@/types/pro'
import type { RouteLocationRaw } from 'vue-router'

import { recreateInterventionRoute } from '@/utils/proSteps'

const props = defineProps<{
  intervention: ProIntervention
}>()

const localePath = useLocalePath()

const route: ComputedRef<RouteLocationRaw | null> = computed(() =>
  recreateInterventionRoute(props.intervention),
)
</script>
