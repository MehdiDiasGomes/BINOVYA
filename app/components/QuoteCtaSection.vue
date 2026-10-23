<template>
  <section
    id="pros"
    aria-labelledby="quote-cta-title"
    :class="cn(HOME_SECTION_CONTAINER_CLASS, 'py-20')"
  >
    <Reveal
      class="relative isolate overflow-hidden rounded-[2rem] bg-linear-to-br from-navy-800 to-primary p-8 text-white sm:p-14"
    >
      <div
        aria-hidden="true"
        class="absolute -right-16 -top-16 -z-10 size-64 rounded-full bg-white/10"
      />
      <div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <p :class="cn(HOME_EYEBROW_CLASS, 'text-white')">{{ $t('home.quoteCta.eyebrow') }}</p>
          <h2 id="quote-cta-title" :class="cn(HOME_SECTION_TITLE_CLASS, 'mb-3')">
            {{ $t('home.quoteCta.title') }}
          </h2>
          <p class="max-w-lg text-white">{{ $t('home.quoteCta.subtitle') }}</p>
        </div>
        <div class="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <AppButton
            :to="localePath('/quote')"
            variant="onDark"
            class="rounded-xl px-6 py-3.5 font-body text-primary"
          >
            {{ $t('home.quoteCta.quote') }}
          </AppButton>
          <AppButton
            :to="localePath('/contact')"
            variant="onDarkGhost"
            class="rounded-xl px-6 py-3.5 text-base"
          >
            {{ $t('home.quoteCta.contact') }}
          </AppButton>
        </div>
      </div>
    </Reveal>
  </section>
</template>

<script setup lang="ts">
import {
  HOME_EYEBROW_CLASS,
  HOME_SECTION_CONTAINER_CLASS,
  HOME_SECTION_TITLE_CLASS,
} from '@/constants/home'
import { cn } from '@/lib/utils'

const localePath = useLocalePath()
</script>
