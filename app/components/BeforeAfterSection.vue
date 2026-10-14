<template>
  <section class="bg-paper py-10">
    <div class="mx-auto max-w-[900px] px-8">
      <Reveal class="overflow-hidden rounded-[22px] border border-[#e6eef2] shadow-[0_20px_44px_-18px_rgba(8,26,46,0.35)]">
        <NuxtImg
          src="/images/avant-apres.jpg"
          :alt="$t('beforeAfter.imageAlt')"
          class="block w-full"
          width="900"
          loading="lazy"
        />
      </Reveal>
    </div>
  </section>
</template>
