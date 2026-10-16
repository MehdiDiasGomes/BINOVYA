<template>
  <div class="space-y-8">
    <section v-if="props.showPhotos" :aria-labelledby="photosTitleId">
      <h2 :id="photosTitleId" class="text-[22px] font-black text-ink">
        {{ $t('account.detail.photos.title') }}
      </h2>
      <p class="mt-1.5 text-[15px] text-ink/80">{{ $t('account.detail.photos.text') }}</p>
      <ul class="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        <li v-for="kind in ACCOUNT_PHOTO_KINDS" :key="kind">
          <p class="font-heading text-sm font-bold text-ink">
            {{ $t(`account.detail.photos.kinds.${kind}`) }}
          </p>
          <div
            class="mt-2 flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-ink/50 bg-paper-2 p-3 text-center text-[13px] font-semibold text-ink/80 sm:text-sm"
          >
            <Icon name="ImageOff" :size="20" aria-hidden="true" class="shrink-0" />
            {{ $t('account.detail.photos.placeholder') }}
          </div>
        </li>
      </ul>
    </section>

    <section :aria-labelledby="invoiceTitleId">
      <h2 :id="invoiceTitleId" class="text-[22px] font-black text-ink">
        {{ $t('account.detail.invoice.title') }}
      </h2>
      <div
        class="mt-4 flex items-center rounded-3xl border border-border bg-white px-5 py-4 shadow-sm"
      >
        <span
          class="inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-700"
        >
          <Icon name="FileText" :size="18" aria-hidden="true" class="shrink-0" />
          {{ $t('account.detail.invoice.soon') }}
        </span>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ACCOUNT_PHOTO_KINDS } from '@/constants/account'

const props = withDefaults(
  defineProps<{
    showPhotos?: boolean
  }>(),
  {
    showPhotos: true,
  },
)

const photosTitleId: string = useId()
const invoiceTitleId: string = useId()
</script>
