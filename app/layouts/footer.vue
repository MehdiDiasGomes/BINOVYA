<template>
  <footer class="bg-navy-950 pb-8 pt-16">
    <h2 class="sr-only">{{ $t('footer.heading') }}</h2>
    <div class="border-t border-line/50 mb-12" aria-hidden="true" />
    <div class="mx-auto max-w-[1180px] px-8">
      <div
        class="mb-12 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
      >
        <div>
          <div class="mb-4 flex items-center gap-1.5">
            <span class="text-xl font-black text-white">BINOVYA</span>
            <span class="text-lg text-turquoise" aria-hidden="true">●</span>
          </div>
          <p class="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            {{ $t('footer.brand.tagline') }}
          </p>
        </div>

        <div>
          <h3 class="mb-4 text-sm font-black uppercase tracking-wider text-white">
            {{ $t('footer.contact.title') }}
          </h3>
          <ul role="list" class="text-[13px] text-muted-foreground">
            <li class="flex min-h-11 items-center gap-2 lg:min-h-8">
              <Icon name="Mail" :size="14" aria-hidden="true" class="shrink-0 text-turquoise" />
              <a
                :href="`mailto:${contactEmail}`"
                :class="cn(FOOTER_LINK_CLASS, 'min-w-0 [overflow-wrap:anywhere]')"
                >{{ contactEmail }}</a
              >
            </li>
          </ul>
        </div>

        <div>
          <h3 class="mb-4 text-sm font-black uppercase tracking-wider text-white">
            {{ $t('footer.commitments.title') }}
          </h3>
          <ul role="list" class="space-y-2 text-[13px] leading-relaxed text-muted-foreground">
            <li>{{ $t('footer.commitments.eco') }}</li>
            <li>{{ $t('footer.commitments.steam') }}</li>
            <li>{{ $t('footer.commitments.quality') }}</li>
          </ul>
        </div>

        <nav aria-labelledby="site-footer-info-heading">
          <h3
            id="site-footer-info-heading"
            class="mb-4 text-sm font-black uppercase tracking-wider text-white"
          >
            {{ $t('footer.info.title') }}
          </h3>
          <ul role="list" class="text-[13px] text-muted-foreground">
            <li v-for="link in FOOTER_INFO_LINKS" :key="link.path">
              <NuxtLink :to="localePath(link.path)" :class="FOOTER_LINK_CLASS">{{
                $t(link.labelKey)
              }}</NuxtLink>
            </li>
          </ul>
        </nav>
      </div>

      <p class="border-t border-line/50 pt-6 text-center text-[12px] text-muted-foreground">
        {{ $t('footer.copyright', { year: currentYear }) }}
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { FOOTER_INFO_LINKS, FOOTER_LINK_CLASS } from '@/constants/footer'
import { cn } from '@/lib/utils'

const { t } = useI18n()
const localePath = useLocalePath()

const currentYear: ComputedRef<number> = computed((): number => new Date().getFullYear())

const contactEmail: ComputedRef<string> = computed((): string => t('contact.info.email.address'))
</script>
