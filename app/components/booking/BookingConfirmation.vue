<template>
  <section
    aria-labelledby="booking-confirmation-title"
    class="mx-auto max-w-2xl rounded-2xl border border-border bg-white p-8 text-center shadow-sm sm:p-10"
  >
    <Motion
      as="span"
      :initial="{ opacity: 0, scale: 0.5 }"
      :animate="{ opacity: 1, scale: 1 }"
      :transition="POP_SPRING"
      class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700"
    >
      <Icon name="CircleCheck" :size="34" aria-hidden="true" />
    </Motion>
    <h2
      id="booking-confirmation-title"
      ref="titleRef"
      tabindex="-1"
      class="mt-5 text-2xl font-black text-ink outline-none"
    >
      {{ $t('booking.confirmation.title') }}
    </h2>
    <p v-if="draft.date" class="mt-3 text-[15px] leading-relaxed text-ink/80">
      {{
        $t('booking.confirmation.text', {
          email: draft.contact.email,
          date: formatLongDate(draft.date, locale),
        })
      }}
    </p>

    <div class="mt-8 rounded-xl bg-paper-2 p-5 text-left">
      <h3 class="text-base font-black text-ink">{{ $t('booking.confirmation.nextTitle') }}</h3>
      <ul class="mt-3 space-y-3 text-sm font-semibold text-ink">
        <li v-for="step in NEXT_STEPS" :key="step.key" class="flex items-start gap-3">
          <Icon
            :name="step.icon"
            :size="18"
            aria-hidden="true"
            class="mt-0.5 shrink-0 text-primary"
          />
          {{ $t(`booking.confirmation.nextSteps.${step.key}`) }}
        </li>
      </ul>
    </div>

    <div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
      <NuxtLink
        :to="localePath('/')"
        class="flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white transition-all duration-150 hover:-translate-y-px hover:bg-navy-800 active:translate-y-0 active:scale-[0.98] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        {{ $t('booking.confirmation.home') }}
      </NuxtLink>
      <AppButton variant="secondary" @click="emit('restart')">
        {{ $t('booking.confirmation.newBooking') }}
      </AppButton>
    </div>
  </section>
</template>

<script setup lang="ts">
import { POP_SPRING } from '@/constants/motion'

type NextStep = {
  key: string
  icon: 'Mail' | 'Trash2' | 'Camera'
}

const emit = defineEmits<{
  restart: []
}>()

const NEXT_STEPS: NextStep[] = [
  { key: 'reminder', icon: 'Mail' },
  { key: 'empty', icon: 'Trash2' },
  { key: 'photos', icon: 'Camera' },
]

const { locale } = useI18n()
const localePath = useLocalePath()
const { draft } = useBookingDraft()

const titleRef: Ref<HTMLElement | null> = ref(null)

onMounted(() => {
  titleRef.value?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: 'instant' })
})
</script>
