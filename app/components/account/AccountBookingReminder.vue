<template>
  <div
    role="note"
    :aria-labelledby="titleId"
    class="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[20px] border border-amber-400/55 bg-amber-400/15 px-4 py-3.5 text-white"
  >
    <Icon
      name="TriangleAlert"
      :size="24"
      aria-hidden="true"
      class="mt-px shrink-0 text-amber-400"
    />
    <div>
      <p :id="titleId" class="font-heading text-[15px] font-bold text-amber-400">
        {{ $t('account.booking.reminder.title') }}
      </p>
      <p class="mt-0.5 text-[14.5px]">{{ $t('account.booking.reminder.text') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const titleId: string = useId()
</script>
