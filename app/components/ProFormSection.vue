<template>
  <section id="contact" class="bg-navy-950 py-20">
    <div class="mx-auto max-w-[1180px] px-8">
      <Reveal class="mb-12 text-center">
        <span class="mb-2.5 block text-[12.5px] font-black uppercase tracking-[1.5px] text-turquoise">
          {{ $t('proForm.eyebrow') }}
        </span>
        <h2 class="text-[32px] font-black text-white">{{ $t('proForm.title') }}</h2>
        <p class="mx-auto mt-3 max-w-[560px] text-[15px] leading-relaxed text-[#7d93a8]">
          {{ $t('proForm.subtitle') }}
        </p>
      </Reveal>

      <Reveal class="mx-auto max-w-2xl">
        <form class="space-y-4" @submit.prevent="handleSubmit">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="pro-lastname" class="block">
                <span class="mb-1 block text-sm font-semibold text-[#dce8f0]">
                  {{ $t('proForm.fields.lastName') }}
                </span>
                <input
                  id="pro-lastname"
                  v-model="form.lastName"
                  type="text"
                  :placeholder="$t('proForm.fields.lastNamePlaceholder')"
                  required
                  class="w-full rounded-lg border border-line bg-navy-800/50 px-4 py-3 text-sm text-white placeholder-[#7d93a8] outline-none transition-colors focus:border-turquoise focus:ring-1 focus:ring-turquoise"
                />
              </label>
            </div>
            <div>
              <label for="pro-firstname" class="block">
                <span class="mb-1 block text-sm font-semibold text-[#dce8f0]">
                  {{ $t('proForm.fields.firstName') }}
                </span>
                <input
                  id="pro-firstname"
                  v-model="form.firstName"
                  type="text"
                  :placeholder="$t('proForm.fields.firstNamePlaceholder')"
                  required
                  class="w-full rounded-lg border border-line bg-navy-800/50 px-4 py-3 text-sm text-white placeholder-[#7d93a8] outline-none transition-colors focus:border-turquoise focus:ring-1 focus:ring-turquoise"
                />
              </label>
            </div>
          </div>

          <div>
            <label for="pro-society" class="block">
              <span class="mb-1 block text-sm font-semibold text-[#dce8f0]">
                {{ $t('proForm.fields.society') }}
              </span>
              <input
                id="pro-society"
                v-model="form.society"
                type="text"
                :placeholder="$t('proForm.fields.societyPlaceholder')"
                class="w-full rounded-lg border border-line bg-navy-800/50 px-4 py-3 text-sm text-white placeholder-[#7d93a8] outline-none transition-colors focus:border-turquoise focus:ring-1 focus:ring-turquoise"
              />
            </label>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="pro-phone" class="block">
                <span class="mb-1 block text-sm font-semibold text-[#dce8f0]">
                  {{ $t('proForm.fields.phone') }}
                </span>
                <input
                  id="pro-phone"
                  v-model="form.phone"
                  type="tel"
                  :placeholder="$t('proForm.fields.phonePlaceholder')"
                  required
                  class="w-full rounded-lg border border-line bg-navy-800/50 px-4 py-3 text-sm text-white placeholder-[#7d93a8] outline-none transition-colors focus:border-turquoise focus:ring-1 focus:ring-turquoise"
                />
              </label>
            </div>
            <div>
              <label for="pro-email" class="block">
                <span class="mb-1 block text-sm font-semibold text-[#dce8f0]">
                  {{ $t('proForm.fields.email') }}
                </span>
                <input
                  id="pro-email"
                  v-model="form.email"
                  type="email"
                  :placeholder="$t('proForm.fields.emailPlaceholder')"
                  required
                  class="w-full rounded-lg border border-line bg-navy-800/50 px-4 py-3 text-sm text-white placeholder-[#7d93a8] outline-none transition-colors focus:border-turquoise focus:ring-1 focus:ring-turquoise"
                />
              </label>
            </div>
          </div>

          <div>
            <label for="pro-subject" class="block">
              <span class="mb-1 block text-sm font-semibold text-[#dce8f0]">
                {{ $t('proForm.fields.subject') }}
              </span>
              <select
                id="pro-subject"
                v-model="form.subject"
                required
                class="w-full rounded-lg border border-line bg-navy-800/50 px-4 py-3 text-sm text-white outline-none transition-colors focus:border-turquoise focus:ring-1 focus:ring-turquoise"
              >
                <option value="" disabled>{{ $t('proForm.fields.subjectPlaceholder') }}</option>
                <option value="quote">{{ $t('proForm.subjects.quote') }}</option>
                <option value="meeting">{{ $t('proForm.subjects.meeting') }}</option>
                <option value="info">{{ $t('proForm.subjects.info') }}</option>
                <option value="other">{{ $t('proForm.subjects.other') }}</option>
              </select>
            </label>
          </div>

          <div>
            <label for="pro-message" class="block">
              <span class="mb-1 block text-sm font-semibold text-[#dce8f0]">
                {{ $t('proForm.fields.message') }}
              </span>
              <textarea
                id="pro-message"
                v-model="form.message"
                rows="5"
                :placeholder="$t('proForm.fields.messagePlaceholder')"
                required
                class="w-full resize-none rounded-lg border border-line bg-navy-800/50 px-4 py-3 text-sm text-white placeholder-[#7d93a8] outline-none transition-colors focus:border-turquoise focus:ring-1 focus:ring-turquoise"
              />
            </label>
          </div>

          <div
            v-if="formStatus"
            :class="[
              'rounded-lg p-3 text-sm font-semibold',
              formStatus === 'ok' ? 'text-green-400' : 'text-red-400',
            ]"
            role="alert"
          >
            {{ formStatus === 'ok' ? $t('proForm.success') : $t('proForm.error') }}
          </div>

          <button
            type="submit"
            :disabled="isSubmitting"
            class="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-4 text-sm font-black text-white shadow-lg shadow-primary/30 transition-all hover:-translate-y-px hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            :aria-label="$t('proForm.submitAriaLabel')"
          >
            <Icon v-if="isSubmitting" name="Loader2" class="h-4 w-4 animate-spin" aria-hidden="true" />
            {{ isSubmitting ? $t('proForm.submitting') : $t('proForm.submit') }}
          </button>
        </form>
      </Reveal>
    </div>
  </section>
</template>

<script setup lang="ts">
type ProSubject = '' | 'quote' | 'meeting' | 'info' | 'other'

type ProForm = {
  lastName: string
  firstName: string
  society: string
  phone: string
  email: string
  subject: ProSubject
  message: string
}

type FormStatus = 'ok' | 'err' | null

const props = withDefaults(
  defineProps<{
    defaultSubject?: ProSubject
  }>(),
  {
    defaultSubject: '',
  },
)

const createEmptyForm = (): ProForm => ({
  lastName: '',
  firstName: '',
  society: '',
  phone: '',
  email: '',
  subject: props.defaultSubject,
  message: '',
})

const form = ref<ProForm>(createEmptyForm())

const isSubmitting = ref<boolean>(false)
const formStatus = ref<FormStatus>(null)

const handleSubmit = async (): Promise<void> => {
  isSubmitting.value = true
  formStatus.value = null

  try {
    await $fetch('/api/contact', {
      method: 'POST',
      body: form.value,
    })
    formStatus.value = 'ok'
    form.value = createEmptyForm()
  } catch {
    formStatus.value = 'err'
  } finally {
    isSubmitting.value = false
  }
}
</script>
