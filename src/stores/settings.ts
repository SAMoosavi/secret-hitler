import { defineStore } from 'pinia'
import { ref } from 'vue'
import { setLocale, type Locale } from '../i18n'
import { storage } from '../platform/storage'

const KEY = 'sh.settings'

export interface Settings {
  locale: Locale
  theme: 'dark' | 'light'
  contrast: 'normal' | 'high'
  sound: boolean
  haptics: boolean
  animations: boolean
  orientation: 'auto' | 'landscape'
  privacy: boolean
  confirmReversible: boolean
  boardScale: number
  autoResume: boolean
}

const defaults = (): Settings => ({
  locale:
    typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('fa')
      ? 'fa'
      : 'en',
  theme: 'dark',
  contrast: 'normal',
  sound: true,
  haptics: true,
  animations: true,
  orientation: 'landscape',
  privacy: true,
  confirmReversible: false,
  boardScale: 1,
  autoResume: false,
})

function isSettings(value: unknown): value is Partial<Settings> {
  return !!value && typeof value === 'object'
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>(defaults())
  const initialized = ref(false)

  function apply(): void {
    if (typeof document === 'undefined') return
    const s = settings.value
    const root = document.documentElement
    root.dataset.theme = s.theme
    root.dataset.contrast = s.contrast
    root.dataset.animations = s.animations ? 'on' : 'off'
    root.lang = s.locale
    root.dir = s.locale === 'fa' ? 'rtl' : 'ltr'
    root.style.setProperty('--board-scale', String(s.boardScale))
    setLocale(s.locale)
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', s.theme === 'dark' ? '#0a1120' : '#e8dfcc')
  }

  async function init(): Promise<void> {
    if (initialized.value) return
    initialized.value = true
    const raw = await storage.get(KEY)
    if (raw) {
      try {
        const parsed: unknown = JSON.parse(raw)
        const version =
          isSettings(parsed) && 'settings' in parsed ? Number((parsed as { v?: number }).v) || 0 : 0
        const loaded =
          isSettings(parsed) && 'settings' in parsed ? (parsed as { settings: unknown }).settings : parsed
        if (isSettings(loaded)) {
          const merged = { ...defaults(), ...loaded }
          merged.boardScale = Math.min(1.1, Math.max(0.85, Number(merged.boardScale) || 1))
          if (!['en', 'fa'].includes(merged.locale)) merged.locale = 'en'
          if (!['dark', 'light'].includes(merged.theme)) merged.theme = 'dark'
          if (!['normal', 'high'].includes(merged.contrast)) merged.contrast = 'normal'
          if (!['auto', 'landscape'].includes(merged.orientation)) merged.orientation = 'landscape'
          // v2: routine confirmations are off unless the user turns them back on.
          if (version < 2) merged.confirmReversible = false
          settings.value = merged
          if (version < 2) persist()
        }
      } catch {
        // A broken settings file falls back to defaults rather than blocking the app.
      }
    }
    apply()
  }

  function persist(): void {
    void storage.set(KEY, JSON.stringify({ v: 2, settings: settings.value }))
  }

  function set<K extends keyof Settings>(key: K, value: Settings[K]): void {
    settings.value = { ...settings.value, [key]: value }
    apply()
    persist()
  }

  return { settings, initialized, init, apply, set }
})
