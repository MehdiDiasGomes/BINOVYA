<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <AppButton
        variant="secondary"
        icon="Navigation"
        trailing-icon="ChevronDown"
        :class="cn('w-full gap-2.5', props.triggerClass)"
      >
        {{ $t('pro.directions.action') }}
        <span class="sr-only">{{ props.context }}</span>
      </AppButton>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" class="min-w-64 rounded-xl p-1.5 shadow-lg">
      <DropdownMenuLabel
        aria-hidden="true"
        class="px-3 pb-1.5 pt-2 text-xs font-black uppercase tracking-[1.5px] text-ink/70"
      >
        {{ $t('pro.directions.menuLabel') }}
      </DropdownMenuLabel>
      <DropdownMenuItem
        v-for="link in links"
        :key="link.id"
        as-child
        class="min-h-12 gap-3 rounded-lg px-3 text-[15px] font-semibold text-ink"
      >
        <a
          :href="link.href"
          :target="link.opensNewTab ? '_blank' : undefined"
          :rel="link.opensNewTab ? 'noopener noreferrer' : undefined"
        >
          <span class="flex size-6 shrink-0 items-center justify-center">
            <GoogleMapsIcon v-if="link.id === 'googleMaps'" :size="20" class="size-5" />
            <WazeIcon v-else-if="link.id === 'waze'" :size="20" class="size-5" />
            <AppleIcon v-else-if="link.id === 'appleMaps'" :size="20" class="size-5 text-ink" />
            <Icon
              v-else
              name="Ellipsis"
              :size="20"
              aria-hidden="true"
              class="size-5 shrink-0 text-ink"
            />
          </span>
          {{ $t(`pro.directions.apps.${link.id}`) }}
          <span v-if="link.opensNewTab" class="sr-only">{{ $t('pro.newTab') }}</span>
        </a>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</template>

<script setup lang="ts">
import type { NavigationAppLink, NavigationPlatform } from '@/types/navigationApps'
import type { MapsStop } from '@/types/pro'
import type { HTMLAttributes } from 'vue'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { detectNavigationPlatform, navigationAppLinks } from '@/utils/navigationApps'

const props = withDefaults(
  defineProps<{
    stop: MapsStop
    context?: string
    triggerClass?: HTMLAttributes['class']
  }>(),
  {
    context: '',
    triggerClass: undefined,
  },
)

const platform: Ref<NavigationPlatform> = ref('other')

onMounted((): void => {
  platform.value = detectNavigationPlatform(navigator.userAgent, navigator.maxTouchPoints)
})

const links: ComputedRef<NavigationAppLink[]> = computed(() =>
  navigationAppLinks(platform.value, props.stop),
)
</script>
