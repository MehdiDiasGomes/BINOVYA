<template>
  <BookingContactFields
    v-model="draft.contact"
    :show-errors="props.showErrors"
    :email-hint="$t('booking.contact.emailHint')"
    :phone-hint="$t('booking.contact.phoneHint')"
  />
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    showErrors?: boolean
  }>(),
  {
    showErrors: false,
  },
)

const { draft } = useBookingDraft()
</script>
