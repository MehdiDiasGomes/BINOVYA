<template>
  <component
    :is="tag"
    ref="rootRef"
    v-bind="{ ...passthroughAttrs(), ...elementAttrs }"
    :aria-disabled="ariaDisabled()"
    :class="rootClass()"
    @click="handleClick"
    @keydown.enter="handleEnter"
  >
    <Icon
      v-if="props.isLoading"
      name="Loader2"
      :size="16"
      aria-hidden="true"
      class="shrink-0 animate-spin motion-reduce:animate-none"
    />
    <slot v-else name="leading">
      <Icon v-if="props.icon" :name="props.icon" :size="16" aria-hidden="true" class="shrink-0" />
    </slot>
    <span class="contents *:min-w-0">
      <slot />
    </span>
    <Icon
      v-if="props.trailingIcon"
      :name="props.trailingIcon"
      :size="16"
      aria-hidden="true"
      class="shrink-0"
    />
  </component>
</template>

<script setup lang="ts">
import { unrefElement } from '@vueuse/core'

import type { LucideIconName } from '@/constants/clients'
import type { ButtonSize, ButtonType, ButtonVariant } from '@/types/button'
import type { ClassValue } from 'clsx'
import type { Component, ComponentPublicInstance } from 'vue'
import type { RouteLocationRaw } from 'vue-router'

import { NuxtLink } from '#components'
import { buttonClass } from '@/constants/buttons'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariant
    size?: ButtonSize
    to?: RouteLocationRaw
    href?: string
    type?: ButtonType
    icon?: LucideIconName
    trailingIcon?: LucideIconName
    isLoading?: boolean
    isDisabled?: boolean
  }>(),
  {
    variant: 'primary',
    size: 'md',
    to: undefined,
    href: undefined,
    type: 'button',
    icon: undefined,
    trailingIcon: undefined,
    isLoading: false,
    isDisabled: false,
  },
)

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

defineOptions({ inheritAttrs: false })

const attrs: Record<string, unknown> = useAttrs()

const rootRef: Ref<HTMLElement | ComponentPublicInstance | null> = ref(null)

const isLink: ComputedRef<boolean> = computed(() => Boolean(props.to || props.href))

const isBlocked: ComputedRef<boolean> = computed(() => props.isLoading || props.isDisabled)

const ariaDisabled = (): unknown => (isBlocked.value ? true : attrs['aria-disabled'])

const tag: ComputedRef<Component | string> = computed(() => {
  if (!isLink.value) {
    return 'button'
  }
  return props.to && !isBlocked.value ? NuxtLink : 'a'
})

const rootClass = (): string =>
  cn(buttonClass({ variant: props.variant, size: props.size }), attrs.class as ClassValue)

const passthroughAttrs = (): Record<string, unknown> =>
  Object.fromEntries(Object.entries(attrs).filter(([name]: [string, unknown]) => name !== 'class'))

const elementAttrs: ComputedRef<Record<string, unknown>> = computed(() => {
  if (!isLink.value) {
    return { type: props.type }
  }
  if (isBlocked.value) {
    return { role: 'link', tabindex: 0 }
  }
  return props.to ? { to: props.to } : { href: props.href }
})

const handleClick = (event: MouseEvent): void => {
  if (isBlocked.value) {
    event.preventDefault()
    return
  }
  emit('click', event)
}

const handleEnter = (event: KeyboardEvent): void => {
  if (isLink.value && isBlocked.value) {
    event.preventDefault()
  }
}

/**
 * Moves keyboard focus to the rendered button or link.
 * @param options - Native focus options
 */
const focus = (options?: FocusOptions): void => {
  unrefElement(rootRef)?.focus(options)
}

defineExpose({ focus })
</script>
