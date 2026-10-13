<template>
  <label :for="props.id" class="block">
    <span class="mb-1.5 block text-sm font-bold text-ink">{{ props.label }}</span>
    <input
      :id="props.id"
      :value="props.modelValue"
      :type="props.type"
      :autocomplete="props.autocomplete"
      :placeholder="props.placeholder"
      :aria-invalid="props.error ? 'true' : undefined"
      :aria-describedby="describedBy"
      required
      class="h-12 w-full rounded-lg border border-ink/25 bg-white px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink/50 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/30 aria-invalid:border-destructive"
      @input="handleInput"
    />
    <span v-if="props.hint" :id="`${props.id}-hint`" class="mt-1.5 block text-[13px] text-ink/70">
      {{ props.hint }}
    </span>
    <span
      v-if="props.error"
      :id="`${props.id}-error`"
      class="mt-1.5 flex items-center gap-1.5 text-[13px] font-bold text-destructive"
    >
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
  </label>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: string
    type?: string
    autocomplete?: string
    placeholder?: string
    hint?: string
    error?: string
  }>(),
  {
    modelValue: '',
    type: 'text',
    autocomplete: 'off',
    placeholder: '',
    hint: '',
    error: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const describedBy: ComputedRef<string | undefined> = computed(() => {
  const ids: string[] = []
  if (props.hint) {
    ids.push(`${props.id}-hint`)
  }
  if (props.error) {
    ids.push(`${props.id}-error`)
  }
  return ids.length > 0 ? ids.join(' ') : undefined
})

const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
