<script setup lang="ts">
import type { AccordionContentProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { AccordionContent } from "reka-ui"
import { cn } from "@/lib/utils"

const props = defineProps<AccordionContentProps & { class?: HTMLAttributes["class"], regionClass?: HTMLAttributes["class"] }>()

const delegatedProps = reactiveOmit(props, "class", "regionClass")
</script>

<template>
  <AccordionContent
    data-slot="accordion-content"
    v-bind="delegatedProps"
    :class="cn('data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down overflow-hidden text-sm', props.regionClass)"
  >
    <div :class="cn('pt-0 pb-4', props.class)">
      <slot />
    </div>
  </AccordionContent>
</template>
