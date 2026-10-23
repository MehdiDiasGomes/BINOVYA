<template>
  <section
    aria-labelledby="form-sent-title"
    class="rounded-2xl border border-border bg-white p-8 text-center shadow-sm sm:p-10"
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
      id="form-sent-title"
      ref="titleRef"
      tabindex="-1"
      class="mt-5 text-2xl font-black text-ink outline-none"
    >
      {{ props.title }}
    </h2>
    <p class="mt-3 text-[15px] leading-relaxed text-ink/80">{{ props.text }}</p>
    <AppButton :to="localePath('/')" class="mt-8 px-6">
      {{ $t('common.backToHome') }}
    </AppButton>
  </section>
</template>

<script setup lang="ts">
import { POP_SPRING } from '@/constants/motion'

const props = withDefaults(
  defineProps<{
    title: string
    text: string
  }>(),
  {},
)

const localePath = useLocalePath()

const titleRef: Ref<HTMLElement | null> = ref(null)

onMounted(() => {
  titleRef.value?.focus()
})
</script>
