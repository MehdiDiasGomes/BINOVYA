<template>
  <footer class="bg-navy-950 pb-8 pt-16">
    <h2 class="sr-only">{{ $t('footer.heading') }}</h2>
    <div class="border-t border-line/50 mb-12" aria-hidden="true" />
    <div class="mx-auto max-w-[1180px] px-8">
      <div
        class="mb-12 grid grid-cols-1 gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]"
      >
        <div>
          <BrandLogo tone="onDark" class="mb-4 block h-16 w-auto" />
          <p class="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
            {{ $t('footer.brand.tagline') }}
          </p>
          <ul
            role="list"
            :aria-label="$t('footer.commitments.title')"
            class="mt-5 space-y-1.5 text-[13px] text-muted-foreground"
          >
            <li v-for="key in FOOTER_COMMITMENT_KEYS" :key="key" class="flex items-center gap-2">
              <Icon name="Check" :size="14" aria-hidden="true" class="shrink-0 text-turquoise" />
              {{ $t(key) }}
            </li>
          </ul>
        </div>

        <nav
          v-for="column in FOOTER_COLUMNS"
          :key="column.id"
          :aria-labelledby="`site-footer-${column.id}-heading`"
        >
          <h3 :id="`site-footer-${column.id}-heading`" :class="FOOTER_HEADING_CLASS">
            {{ $t(column.titleKey) }}
          </h3>
          <ul role="list" :class="FOOTER_LIST_CLASS">
            <li
              v-for="link in column.links"
              :key="link.kind === 'page' ? link.labelKey : link.kind"
            >
              <a
                v-if="link.kind === 'email'"
                :href="`mailto:${contactEmail}`"
                :class="cn(FOOTER_LINK_CLASS, 'min-w-0')"
              >
                <Icon name="Mail" :size="14" aria-hidden="true" class="shrink-0 text-turquoise" />
                <span class="min-w-0 [overflow-wrap:anywhere]">{{ contactEmail }}</span>
              </a>
              <NuxtLink
                v-else-if="link.kind === 'account'"
                :to="accountPath"
                :class="FOOTER_LINK_CLASS"
              >
                {{ $t(accountLabelKey) }}
              </NuxtLink>
              <a
                v-else-if="link.hash"
                :href="localePath(link.path) + link.hash"
                :class="FOOTER_LINK_CLASS"
                @click="goToAnchor($event, link)"
              >
                {{ $t(link.labelKey) }}
              </a>
              <NuxtLink v-else :to="localePath(link.path)" :class="FOOTER_LINK_CLASS">
                {{ $t(link.labelKey) }}
              </NuxtLink>
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
import type { FooterPageLink } from '@/types/footer'

import {
  FOOTER_COLUMNS,
  FOOTER_COMMITMENT_KEYS,
  FOOTER_HEADING_CLASS,
  FOOTER_LINK_CLASS,
  FOOTER_LIST_CLASS,
} from '@/constants/footer'
import { cn } from '@/lib/utils'

const { t } = useI18n()
const localePath = useLocalePath()
const { path: accountPath, labelKey: accountLabelKey } = useAccountNavLink()
const navigateToItem = useAnchorNavigation()

const currentYear: ComputedRef<number> = computed((): number => new Date().getFullYear())

const contactEmail: ComputedRef<string> = computed((): string => t('contact.info.email.address'))

const goToAnchor = async (event: MouseEvent, link: FooterPageLink): Promise<void> => {
  if ((await navigateToItem(event, link)) === 'currentPage') {
    await nextTick()
    focusAnchorTarget(link.focusId)
  }
}
</script>
