<template>
  <section
    aria-labelledby="quote-sent-title"
    class="rounded-2xl border border-border bg-white p-8 text-center shadow-sm sm:p-10"
  >
    <span
      class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700"
    >
      <Icon name="CircleCheck" :size="34" aria-hidden="true" />
    </span>
    <h2
      id="quote-sent-title"
      ref="titleRef"
      tabindex="-1"
      class="mt-5 text-2xl font-black text-ink outline-none"
    >
      {{ $t('quote.sent.title') }}
    </h2>
    <p class="mt-3 text-[15px] leading-relaxed text-ink/80">{{ $t('quote.sent.text') }}</p>
    <NuxtLink
      :to="localePath('/')"
      class="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-primary px-6 text-sm font-bold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40"
    >
      {{ $t('quote.sent.home') }}
    </NuxtLink>
  </section>
</template>

<script setup lang="ts">
const localePath = useLocalePath()

const titleRef: Ref<HTMLElement | null> = ref(null)

onMounted(() => {
  titleRef.value?.focus()
})
</script>
