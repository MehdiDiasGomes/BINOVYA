<template>
  <div>
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
        :required="props.isRequired"
        class="h-12 w-full rounded-lg border border-ink/50 bg-white px-4 text-[15px] text-ink outline-none transition-shadow placeholder:text-ink/60 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/60 aria-invalid:border-destructive"
        @input="handleInput"
      />
    </label>
    <span v-if="props.hint" :id="`${props.id}-hint`" class="mt-1.5 block text-[13px] text-ink/70">
      {{ props.hint }}
    </span>
    <span v-if="props.error" :id="`${props.id}-error`" role="alert" :class="FIELD_ERROR_CLASS">
      <Icon name="CircleAlert" :size="14" aria-hidden="true" />
      {{ props.error }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { FIELD_ERROR_CLASS } from '@/constants/booking'
import { describedByIds } from '@/utils/field'

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
    isRequired?: boolean
  }>(),
  {
    modelValue: '',
    type: 'text',
    autocomplete: 'off',
    placeholder: '',
    hint: '',
    error: '',
    isRequired: true,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const describedBy: ComputedRef<string | undefined> = computed(() =>
  describedByIds(props.id, props.hint, props.error),
)

const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
