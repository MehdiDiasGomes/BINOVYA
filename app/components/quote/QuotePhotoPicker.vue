<template>
  <div>
    <p class="text-lg font-black text-ink">{{ $t('quote.photos.legend') }}</p>
    <p id="quote-photos-hint" class="mt-1 text-sm text-ink/70">
      {{ $t('quote.photos.hint', photoLimits) }}
    </p>

    <label
      for="quote-photos"
      class="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-lg border border-ink/50 bg-white px-4 text-sm font-bold text-ink transition-colors hover:border-primary hover:bg-paper-2 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-primary has-[:focus-visible]:ring-offset-2"
    >
      <Icon name="Camera" :size="16" aria-hidden="true" />
      {{ $t('quote.photos.add') }}
      <input
        id="quote-photos"
        type="file"
        multiple
        :accept="QUOTE_PHOTO_MIME_TYPES.join(',')"
        aria-describedby="quote-photos-hint"
        class="sr-only"
        @change="handleFiles"
      />
    </label>

    <p v-if="issue" role="alert" :class="cn('mt-2 text-[13px] font-bold', ERROR_TEXT_TONE_CLASS)">
      {{ $t(`quote.photos.issues.${issue}`, photoLimits) }}
    </p>

    <ul
      v-if="previews.length > 0"
      class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
    >
      <li
        v-for="(preview, index) in previews"
        :key="`${preview.file.name}-${preview.file.lastModified}`"
        class="min-w-0"
      >
        <div
          class="relative aspect-square overflow-hidden rounded-lg border border-border bg-paper-2"
        >
          <img
            :src="preview.url"
            :alt="$t('quote.photos.previewAlt', { index: index + 1, name: preview.file.name })"
            class="h-full w-full object-cover"
          />
          <button
            type="button"
            :aria-label="$t('quote.photos.remove', { name: preview.file.name })"
            class="absolute right-1.5 top-1.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-md transition-colors hover:bg-paper-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary focus-visible:ring-offset-2"
            @click="removeAt(index)"
          >
            <Icon name="X" :size="16" aria-hidden="true" />
          </button>
        </div>
        <p class="mt-1 truncate text-xs text-ink/70">{{ preview.file.name }}</p>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import type { QuotePhotoIssue, QuotePhotoPreview } from '@/types/quote'

import { ERROR_TEXT_TONE_CLASS } from '@/constants/feedback'
import {
  QUOTE_MAX_PHOTO_BYTES,
  QUOTE_MAX_PHOTO_MEGABYTES,
  QUOTE_MAX_PHOTOS,
  QUOTE_PHOTO_MIME_TYPES,
} from '@/constants/quote'
import { cn } from '@/lib/utils'

type PhotoLimits = {
  count: number
  size: number
}

const props = withDefaults(
  defineProps<{
    modelValue?: File[]
  }>(),
  {
    modelValue: () => [],
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: File[]]
}>()

const photoLimits: PhotoLimits = { count: QUOTE_MAX_PHOTOS, size: QUOTE_MAX_PHOTO_MEGABYTES }

const issue: Ref<QuotePhotoIssue | null> = ref(null)
const previews: Ref<QuotePhotoPreview[]> = ref([])
const previewUrls: Map<File, string> = new Map()

const previewUrlFor = (file: File): string => {
  const known: string | undefined = previewUrls.get(file)
  if (known) {
    return known
  }
  const url: string = URL.createObjectURL(file)
  previewUrls.set(file, url)
  return url
}

const releaseUnusedPreviews = (files: File[]): void => {
  previewUrls.forEach((url, file) => {
    if (!files.includes(file)) {
      URL.revokeObjectURL(url)
      previewUrls.delete(file)
    }
  })
}

watch(
  () => props.modelValue,
  files => {
    releaseUnusedPreviews(files)
    previews.value = files.map(file => ({ file, url: previewUrlFor(file) }))
  },
  { immediate: true },
)

onBeforeUnmount(() => releaseUnusedPreviews([]))

const findIssue = (file: File, count: number): QuotePhotoIssue | null => {
  if (count >= QUOTE_MAX_PHOTOS) {
    return 'tooMany'
  }
  if (!QUOTE_PHOTO_MIME_TYPES.includes(file.type)) {
    return 'wrongType'
  }
  return file.size > QUOTE_MAX_PHOTO_BYTES ? 'tooLarge' : null
}

const handleFiles = (event: Event): void => {
  const input = event.target as HTMLInputElement
  const accepted: File[] = [...props.modelValue]
  issue.value = null

  for (const file of Array.from(input.files ?? [])) {
    const isDuplicate: boolean = accepted.some(
      known =>
        known.name === file.name &&
        known.size === file.size &&
        known.lastModified === file.lastModified,
    )
    if (isDuplicate) {
      continue
    }
    const found: QuotePhotoIssue | null = findIssue(file, accepted.length)
    if (found) {
      issue.value = found
    } else {
      accepted.push(file)
    }
  }

  input.value = ''
  emit('update:modelValue', accepted)
}

const removeAt = (index: number): void => {
  issue.value = null
  emit(
    'update:modelValue',
    props.modelValue.filter((_file, position) => position !== index),
  )
}
</script>
