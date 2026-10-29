import { createI18n } from 'vue-i18n'
import en from './en'
import fa from './fa'

export const locales = ['en', 'fa'] as const
export type Locale = (typeof locales)[number]
export type MessageSchema = typeof en

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, fa },
})

export function setLocale(locale: Locale): void {
  i18n.global.locale.value = locale
}
