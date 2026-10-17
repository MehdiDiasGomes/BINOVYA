<template>
  <div class="flex flex-1 flex-col gap-6">
    <nav :aria-label="$t('pro.nav.label')">
      <ul class="flex flex-col gap-1">
        <li v-for="item in PRO_NAV_ITEMS" :key="item.path">
          <NuxtLink
            :to="localePath(item.path)"
            :class="PRO_NAV_LINK_CLASS"
            @click="emit('navigate')"
          >
            <Icon
              :name="item.icon"
              :size="18"
              aria-hidden="true"
              class="shrink-0 group-aria-[current=page]:text-turquoise"
            />
            {{ $t(item.labelKey) }}
          </NuxtLink>
        </li>
      </ul>
    </nav>
    <div class="mt-auto flex flex-col gap-3 border-t border-white/10 pt-4">
      <p v-if="email" class="min-w-0 rounded-lg bg-white/5 px-3 py-2.5 text-sm">
        <span class="block text-[13px] text-white/70">{{ $t('pro.nav.signedInAs') }}</span>
        <span class="block break-all font-bold text-white" :title="email">{{ email }}</span>
      </p>
      <AppButton
        variant="onDarkOutline"
        size="sm"
        icon="LogOut"
        :is-loading="isSigningOut"
        class="w-full px-3"
        @click="signOut"
      >
        {{ isSigningOut ? $t('pro.nav.signingOut') : $t('pro.nav.signOut') }}
      </AppButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { PRO_NAV_ITEMS, PRO_NAV_LINK_CLASS } from '@/constants/pro'

const emit = defineEmits<{
  navigate: []
}>()

const localePath = useLocalePath()
const { email, leave } = useAdminSession()

const isSigningOut: Ref<boolean> = ref(false)

const signOut = async (): Promise<void> => {
  if (isSigningOut.value) {
    return
  }
  isSigningOut.value = true
  try {
    await leave()
  } finally {
    isSigningOut.value = false
  }
}
</script>
