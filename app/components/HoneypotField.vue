<template>
  <div aria-hidden="true" class="absolute -left-[9999px] h-0 w-0 overflow-hidden">
    <label :for="props.id">
      {{ $t('common.honeypot') }}
      <input
        :id="props.id"
        :value="props.modelValue"
        type="text"
        name="website"
        tabindex="-1"
        autocomplete="off"
        @input="handleInput"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    id: string
    modelValue?: string
  }>(),
  {
    modelValue: '',
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const handleInput = (event: Event): void => {
  emit('update:modelValue', (event.target as HTMLInputElement).value)
}
</script>
