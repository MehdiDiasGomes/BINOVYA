<template>
  <section id="services" class="bg-paper py-20">
    <div class="mx-auto max-w-[1180px] px-8">
      <Reveal class="mb-12 text-center">
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-primary">
          {{ $t('services.eyebrow') }}
        </span>
        <h2
          :id="SERVICES_HEADING_ID"
          tabindex="-1"
          class="scroll-mt-24 text-[32px] font-black text-ink outline-none"
        >
          {{ $t('services.title') }}
        </h2>
        <p class="mx-auto mt-3 max-w-[560px] text-[15px] leading-relaxed text-muted-foreground">
          {{ $t('services.subtitle') }}
        </p>
      </Reveal>

      <div class="grid grid-cols-2 gap-5 lg:grid-cols-4">
        <Reveal
          v-for="(service, index) in serviceItems"
          :key="service.key"
          :delay="index * REVEAL_STAGGER"
        >
          <div
            class="group h-full overflow-hidden rounded-2xl border border-[#e6eef2] bg-white shadow-sm transition-all hover:-translate-y-1.5 hover:shadow-lg"
          >
            <div
              class="relative flex h-32 items-center justify-center overflow-hidden bg-gradient-to-br from-navy-900 to-navy-800"
            >
              <NuxtImg
                v-if="service.image"
                :src="service.image"
                :alt="$t(service.titleKey)"
                class="h-full w-full object-cover transition-transform duration-400 group-hover:scale-105"
                width="300"
                loading="lazy"
              />
              <Icon
                v-else
                :name="service.icon"
                class="h-12 w-12 text-turquoise"
                aria-hidden="true"
              />
            </div>
            <div class="p-4">
              <h3 class="mb-1.5 text-[14px] font-black leading-snug text-ink">
                {{ $t(service.titleKey) }}
              </h3>
              <p class="text-[12.5px] leading-snug text-muted-foreground">
                {{ $t(service.descKey) }}
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { REVEAL_STAGGER } from '@/constants/motion'
import { SERVICES_HEADING_ID } from '@/constants/navbar'

type ServiceItem = {
  key: string
  icon: string
  image?: string
  titleKey: string
  descKey: string
}

const serviceItems: ServiceItem[] = [
  {
    key: 'bins',
    icon: 'Trash2',
    image: '/images/services/bins.png',
    titleKey: 'services.items.bins.title',
    descKey: 'services.items.bins.desc',
  },
  {
    key: 'pav',
    icon: 'Package',
    image: '/images/services/pav.png',
    titleKey: 'services.items.pav.title',
    descKey: 'services.items.pav.desc',
  },
  {
    key: 'urban',
    icon: 'Landmark',
    image: '/images/services/urban.png',
    titleKey: 'services.items.urban.title',
    descKey: 'services.items.urban.desc',
  },
  {
    key: 'signage',
    icon: 'SignpostBig',
    image: '/images/services/signage.png',
    titleKey: 'services.items.signage.title',
    descKey: 'services.items.signage.desc',
  },
]
</script>
