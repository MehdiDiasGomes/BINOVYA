<template>
  <section id="faq" :aria-labelledby="HOME_FAQ_HEADING_ID" class="bg-white py-20">
    <div
      :class="cn(HOME_SECTION_CONTAINER_CLASS, 'grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.6fr]')"
    >
      <Reveal>
        <p :class="cn(HOME_EYEBROW_CLASS, 'text-primary')">{{ $t('home.faq.eyebrow') }}</p>
        <h2
          :id="HOME_FAQ_HEADING_ID"
          tabindex="-1"
          :class="cn(HOME_SECTION_TITLE_CLASS, 'scroll-mt-24 text-ink outline-none')"
        >
          {{ $t('home.faq.title') }}
        </h2>
      </Reveal>
      <Reveal :delay="REVEAL_STAGGER">
        <Accordion
          type="single"
          collapsible
          :default-value="HOME_FAQ_KEYS[0]"
          :unmount-on-hide="false"
          class="divide-y divide-ink/15 border-y border-ink/15"
        >
          <AccordionItem
            v-for="key in HOME_FAQ_KEYS"
            :key="key"
            :value="key"
            class="border-b-0 py-5"
          >
            <AccordionTrigger
              class="min-h-11 cursor-pointer items-center py-0 text-base font-heading font-bold text-ink transition-none hover:no-underline focus-visible:ring-primary focus-visible:ring-offset-2 [&[data-state=open]>svg]:rotate-45"
            >
              {{ $t(`home.faq.items.${key}.question`) }}
              <template #icon>
                <Icon
                  name="Plus"
                  :size="20"
                  aria-hidden="true"
                  :class="cn('shrink-0 text-primary', ACCORDION_ICON_MOTION_CLASS)"
                />
              </template>
            </AccordionTrigger>
            <AccordionContent
              :region-class="cn('text-base', ACCORDION_PANEL_MOTION_CLASS)"
              class="pt-3 pb-0 pr-8 leading-relaxed text-ink/70"
            >
              <p>{{ $t(`home.faq.items.${key}.answer`) }}</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Reveal>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  HOME_EYEBROW_CLASS,
  HOME_FAQ_HEADING_ID,
  HOME_FAQ_KEYS,
  HOME_SECTION_CONTAINER_CLASS,
  HOME_SECTION_TITLE_CLASS,
} from '@/constants/home'
import {
  ACCORDION_ICON_MOTION_CLASS,
  ACCORDION_PANEL_MOTION_CLASS,
  REVEAL_STAGGER,
} from '@/constants/motion'
import { cn } from '@/lib/utils'
</script>
