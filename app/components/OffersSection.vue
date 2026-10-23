<template>
  <section
    id="tarifs"
    :aria-labelledby="HOME_OFFERS_HEADING_ID"
    class="bg-navy-950 py-20 text-white"
  >
    <div :class="HOME_SECTION_CONTAINER_CLASS">
      <Reveal class="mb-12 text-center">
        <p :class="cn(HOME_EYEBROW_CLASS, 'text-turquoise')">{{ $t('home.offers.eyebrow') }}</p>
        <h2
          :id="HOME_OFFERS_HEADING_ID"
          tabindex="-1"
          :class="cn(HOME_SECTION_TITLE_CLASS, 'mb-3 scroll-mt-24 outline-none')"
        >
          {{ $t('home.offers.title') }}
        </h2>
        <p class="text-on-navy">{{ $t('home.offers.subtitle') }}</p>
      </Reveal>

      <ul role="list" class="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
        <Reveal
          v-for="(offer, index) in HOME_OFFERS"
          :key="offer.key"
          as="li"
          :delay="index * REVEAL_STAGGER"
          :class="
            cn(
              'relative flex flex-col rounded-3xl p-8',
              offer.isHighlighted
                ? 'bg-white text-ink shadow-2xl shadow-turquoise/20 ring-2 ring-turquoise'
                : 'bg-white/5 ring-1 ring-white/10',
            )
          "
        >
          <span
            v-if="offer.isHighlighted"
            class="absolute -top-3 right-8 rounded-full bg-turquoise px-3 py-1 text-xs font-bold text-navy-950"
          >
            {{ $t(`home.offers.${offer.key}.badge`) }}
          </span>
          <div class="mb-6 flex items-center gap-4">
            <div
              class="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-paper-2 md:size-24"
            >
              <BookingBinIllustration :service="offer.slug" class="size-14 md:size-16" />
            </div>
            <div class="min-w-0">
              <h3 class="text-xl font-extrabold">{{ $t(`home.offers.${offer.key}.title`) }}</h3>
              <p :class="cn('text-sm', mutedTextClass(offer))">
                {{ $t(`home.offers.${offer.key}.capacity`) }}
              </p>
            </div>
          </div>
          <p class="mb-1 flex items-baseline gap-1.5">
            <span :class="cn('shrink-0 whitespace-nowrap text-sm', mutedTextClass(offer))">
              {{ $t('home.offers.priceFrom') }}
            </span>
            <span class="whitespace-nowrap font-heading text-5xl font-black">
              {{ $t(`home.offers.${offer.key}.price`) }}
            </span>
          </p>
          <p :class="cn('mb-6 text-sm', mutedTextClass(offer))">
            {{ $t('home.offers.priceNote') }}
          </p>
          <ul
            role="list"
            :class="
              cn(
                'mb-8 flex-1 space-y-2.5 text-sm',
                offer.isHighlighted ? 'text-ink/70' : 'text-on-navy',
              )
            "
          >
            <li v-for="item in HOME_OFFER_INCLUDED_KEYS" :key="item" class="flex items-start gap-2">
              <Icon
                name="Check"
                :size="16"
                aria-hidden="true"
                :class="
                  cn('mt-0.5 shrink-0', offer.isHighlighted ? 'text-primary' : 'text-turquoise')
                "
              />
              {{ $t(`home.offers.included.${item}`) }}
            </li>
          </ul>
          <AppButton
            :to="{ path: localePath('/booking'), query: { service: offer.slug } }"
            :variant="offer.isHighlighted ? 'primary' : 'onDarkOutline'"
            class="rounded-xl px-6 py-3 text-base"
          >
            {{ $t('home.offers.cta') }}
            <span class="sr-only">{{ $t(`home.offers.${offer.key}.ctaContext`) }}</span>
          </AppButton>
        </Reveal>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { HomeOffer } from '@/types/home'

import {
  HOME_EYEBROW_CLASS,
  HOME_OFFER_INCLUDED_KEYS,
  HOME_OFFERS,
  HOME_OFFERS_HEADING_ID,
  HOME_SECTION_CONTAINER_CLASS,
  HOME_SECTION_TITLE_CLASS,
} from '@/constants/home'
import { REVEAL_STAGGER } from '@/constants/motion'
import { cn } from '@/lib/utils'

const localePath = useLocalePath()

const mutedTextClass = (offer: HomeOffer): string =>
  offer.isHighlighted ? 'text-ink/70' : 'text-muted-foreground'
</script>
