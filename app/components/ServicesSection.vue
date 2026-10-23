<template>
  <section
    id="services"
    :aria-labelledby="SERVICES_HEADING_ID"
    :class="cn(HOME_SECTION_CONTAINER_CLASS, 'py-20')"
  >
    <Reveal class="mb-12 flex flex-wrap items-end justify-between gap-4">
      <div class="max-w-xl">
        <p :class="cn(HOME_EYEBROW_CLASS, 'text-primary')">{{ $t('home.services.eyebrow') }}</p>
        <h2
          :id="SERVICES_HEADING_ID"
          tabindex="-1"
          :class="cn(HOME_SECTION_TITLE_CLASS, 'mb-3 scroll-mt-24 text-ink outline-none')"
        >
          {{ $t('home.services.title') }}
        </h2>
        <p class="text-ink/70">{{ $t('home.services.subtitle') }}</p>
      </div>
      <NuxtLink :to="localePath('/quote')" :class="cn(TEXT_LINK_CLASS, 'font-bold')">
        {{ $t('home.services.quoteLink') }}
        <Icon name="ArrowRight" :size="16" aria-hidden="true" />
      </NuxtLink>
    </Reveal>

    <ul role="list" class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <Reveal
        v-for="(service, index) in HOME_SERVICES"
        :key="service.key"
        as="li"
        :delay="index * REVEAL_STAGGER"
      >
        <article class="h-full overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-border">
          <div class="aspect-[4/3] overflow-hidden">
            <NuxtImg
              :src="service.image"
              alt=""
              class="h-full w-full object-cover"
              width="300"
              height="225"
              sizes="sm:50vw lg:300px"
              format="webp"
              loading="lazy"
            />
          </div>
          <div class="p-5">
            <span
              class="mb-2 inline-block rounded-full bg-paper-2 px-2.5 py-0.5 text-xs font-bold text-primary"
            >
              {{ $t(`home.services.items.${service.key}.tag`) }}
            </span>
            <h3 class="mb-1 font-extrabold text-ink">
              {{ $t(`home.services.items.${service.key}.title`) }}
            </h3>
            <p class="text-sm text-ink/70">
              {{ $t(`home.services.items.${service.key}.desc`) }}
            </p>
          </div>
        </article>
      </Reveal>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { TEXT_LINK_CLASS } from '@/constants/buttons'
import {
  HOME_EYEBROW_CLASS,
  HOME_SECTION_CONTAINER_CLASS,
  HOME_SECTION_TITLE_CLASS,
  HOME_SERVICES,
} from '@/constants/home'
import { REVEAL_STAGGER } from '@/constants/motion'
import { SERVICES_HEADING_ID } from '@/constants/navbar'
import { cn } from '@/lib/utils'

const localePath = useLocalePath()
</script>
