<template>
  <aside
    aria-labelledby="booking-summary-title"
    class="h-fit rounded-2xl border border-border bg-white p-6 shadow-sm lg:sticky lg:top-24"
  >
    <h2 id="booking-summary-title" class="text-lg font-black text-ink">
      {{ $t('booking.summary.title') }}
    </h2>

    <dl class="mt-5 space-y-4 text-sm">
      <div>
        <dt class="text-xs font-black uppercase tracking-[1.2px] text-ink/70">
          {{ $t('booking.summary.address') }}
        </dt>
        <dd class="mt-1 font-semibold text-ink">
          {{ draft.address?.label ?? $t('booking.summary.empty') }}
        </dd>
      </div>

      <div>
        <dt class="text-xs font-black uppercase tracking-[1.2px] text-ink/70">
          {{ $t('booking.summary.services') }}
        </dt>
        <dd class="mt-1 font-semibold text-ink">
          <span v-if="lines.length === 0">{{ $t('booking.summary.empty') }}</span>
          <ul v-else class="space-y-1">
            <li v-for="line in lines" :key="line.service.slug" class="flex justify-between gap-3">
              <span>
                {{
                  $t('booking.summary.line', {
                    quantity: line.quantity,
                    service: $t(line.service.titleKey),
                  })
                }}
              </span>
              <span class="shrink-0">{{ formatPrice(line.totalCents, locale) }}</span>
            </li>
          </ul>
        </dd>
      </div>

      <div>
        <dt class="text-xs font-black uppercase tracking-[1.2px] text-ink/70">
          {{ $t('booking.summary.date') }}
        </dt>
        <dd class="mt-1 font-semibold capitalize text-ink">
          {{ draft.date ? formatLongDate(draft.date, locale) : $t('booking.summary.empty') }}
        </dd>
      </div>
    </dl>

    <div class="mt-5 flex items-baseline justify-between border-t border-border pt-4">
      <span class="text-sm font-black text-ink">{{ $t('booking.summary.total') }}</span>
      <span class="text-2xl font-black text-ink" aria-live="polite">
        {{ formatPrice(totalCents, locale) }}
      </span>
    </div>
    <p class="mt-1 text-right text-xs text-ink/70">{{ $t('booking.summary.taxNote') }}</p>
  </aside>
</template>

<script setup lang="ts">
const { locale } = useI18n()
const { draft, lines, totalCents } = useBookingDraft()
</script>
