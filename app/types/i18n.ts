import type { Locale, MessageFunction, VueMessageType } from 'vue-i18n'

export type RawLocaleMessage = MessageFunction<VueMessageType> | VueMessageType

export type LanguageSwitcherVariant = 'desktop' | 'mobile'

export type LanguageLink = {
  code: Locale
  name: string
  language: string
  path: string
  isCurrent: boolean
  isCodeInName: boolean
}
