<template>
  <BookingPlanOptions v-model="draft.plan" :price-for="priceFor" :has-grid-error="hasGridError" />
</template>

<script setup lang="ts">
const { draft } = useBookingDraft()
const { priceFor, hasGridError } = useBookingPrice()
</script>
