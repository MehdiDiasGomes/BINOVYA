<template>
  <aside :aria-label="$t('quote.aside.label')" class="space-y-4">
    <section
      aria-labelledby="quote-steps-title"
      class="rounded-2xl border border-border bg-white p-5 shadow-sm"
    >
      <h2 id="quote-steps-title" class="text-base font-black text-ink">
        {{ $t('quote.aside.steps.title') }}
      </h2>
      <ol class="mt-5">
        <li
          v-for="(step, index) in QUOTE_STEPS"
          :key="step"
          class="relative flex gap-3 pb-5 last:pb-0"
        >
          <span
            v-if="index < QUOTE_STEPS.length - 1"
            aria-hidden="true"
            class="absolute bottom-1 left-3.5 top-8 w-px bg-ink/20"
          />
          <span
            aria-hidden="true"
            class="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white"
          >
            {{ index + 1 }}
          </span>
          <div class="min-w-0 pt-0.5">
            <p class="text-sm font-bold text-ink">
              {{ $t(`quote.aside.steps.items.${step}.title`) }}
            </p>
            <p class="mt-0.5 text-[13px] leading-relaxed text-ink/70">
              {{ $t(`quote.aside.steps.items.${step}.text`) }}
            </p>
          </div>
        </li>
      </ol>
    </section>

    <section aria-labelledby="quote-online-title" class="rounded-2xl bg-navy-900 p-5 shadow-sm">
      <h2 id="quote-online-title" class="text-base font-black text-white">
        {{ $t('quote.aside.online.title') }}
      </h2>
      <p class="mt-1.5 text-sm leading-relaxed text-white/80">
        {{ $t('quote.aside.online.text') }}
      </p>
      <AppButton
        :to="localePath('/booking')"
        variant="onDark"
        size="sm"
        icon="CalendarCheck"
        class="mt-4 rounded-lg font-body text-sm"
      >
        {{ $t('quote.aside.online.cta') }}
      </AppButton>
    </section>

    <p class="flex flex-wrap items-center gap-x-1.5 px-1 text-sm text-ink/80">
      {{ $t('quote.aside.contact.text') }}
      <NuxtLink
        :to="localePath('/contact')"
        class="inline-flex min-h-11 items-center rounded-sm font-bold text-ink underline underline-offset-4 hover:text-primary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {{ $t('quote.aside.contact.cta') }}
      </NuxtLink>
    </p>
  </aside>
</template>

<script setup lang="ts">
const QUOTE_STEPS: string[] = ['request', 'quote', 'intervention']

const localePath = useLocalePath()
</script>
