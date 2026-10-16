// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const isTestServer: boolean = process.env.BINOVYA_TEST_SERVER === '1'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  buildDir: isTestServer ? '.nuxt-test' : '.nuxt',
  devtools: { enabled: true },
  css: ['~/assets/css/tailwind.css'],

  runtimeConfig: {
    resendApiKey: '',
    contactEmailTo: '',
    mailFrom: '',
    mailTransport: '',
    mailOutboxDir: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    siteUrl: '',
    addressTokenSecret: '',
  },

  nitro: {
    experimental: { tasks: true },
    scheduledTasks:
      process.env.NODE_ENV === 'production' ? { '0 6 * * *': ['booking:reminders'] } : {},
  },

  vite: {
    plugins: [tailwindcss()],
    cacheDir: isTestServer ? 'node_modules/.cache/vite-test' : undefined,
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'motion-v',
        'lucide-vue-next',
        'vue-sonner',
        'clsx',
        'tailwind-merge',
        'zod',
        '@vueuse/core',
        'country-flag-icons/string/3x2',
        'reka-ui',
        '@internationalized/date',
      ],
    },
    server: {
      fs: {
        deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/.mail-outbox/**'],
      },
    },
  },
  modules: [
    'shadcn-nuxt',
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxtjs/i18n',
    '@nuxt/fonts',
    'motion-v/nuxt',
    '@nuxtjs/supabase',
  ],
  supabase: {
    redirect: false,
  },
  shadcn: {
    /**
     * Prefix for all the imported component.
     * @default "Ui"
     */
    prefix: '',
    /**
     * Directory that the component lives in.
     * Will respect the Nuxt aliases.
     * @link https://nuxt.com/docs/api/nuxt-config#alias
     * @default "@/components/ui"
     */
    componentDir: '@/components/ui',
  },
  i18n: {
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.ts' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.ts' },
    ],
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    langDir: 'locales',
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root',
    },
  },
  fonts: {
    families: [
      { name: 'Montserrat', provider: 'google' },
      { name: 'Quicksand', provider: 'google' },
    ],
  },
})
