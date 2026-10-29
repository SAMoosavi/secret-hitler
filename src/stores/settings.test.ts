import { beforeEach, describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useSettingsStore } from './settings'

async function newStore() {
  setActivePinia(createPinia())
  const store = useSettingsStore()
  await store.init()
  return store
}

describe('settings', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('dir')
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-contrast')
    document.documentElement.removeAttribute('data-animations')
  })

  it('applies defaults to the document', async () => {
    const store = await newStore()
    expect(store.settings.theme).toBe('dark')
    expect(store.settings.confirmReversible).toBe(false)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(document.documentElement.dataset.animations).toBe('on')
  })

  it('persists and re-applies locale, direction, theme, contrast and motion', async () => {
    const store = await newStore()
    store.set('locale', 'fa')
    store.set('theme', 'light')
    store.set('contrast', 'high')
    store.set('animations', false)
    store.set('boardScale', 0.9)
    expect(document.documentElement.dir).toBe('rtl')
    expect(document.documentElement.lang).toBe('fa')
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(document.documentElement.dataset.contrast).toBe('high')
    expect(document.documentElement.dataset.animations).toBe('off')

    const reloaded = await newStore()
    expect(reloaded.settings.locale).toBe('fa')
    expect(reloaded.settings.theme).toBe('light')
    expect(reloaded.settings.contrast).toBe('high')
    expect(reloaded.settings.animations).toBe(false)
    expect(reloaded.settings.boardScale).toBeCloseTo(0.9)
  })

  it('clamps board scale and survives a broken settings file', async () => {
    localStorage.setItem('sh.settings', '{"v":1,"settings":{"boardScale":9,"theme":"neon"}}')
    const store = await newStore()
    expect(store.settings.boardScale).toBe(1.1)
    expect(store.settings.theme).toBe('dark')
  })

  it('migrates a v1 save to routine confirmations off, keepable by the user', async () => {
    localStorage.setItem('sh.settings', '{"v":1,"settings":{"confirmReversible":true,"theme":"light"}}')
    const migrated = await newStore()
    expect(migrated.settings.confirmReversible).toBe(false)
    expect(migrated.settings.theme).toBe('light')
    expect(JSON.parse(localStorage.getItem('sh.settings') ?? '{}').v).toBe(2)

    migrated.set('confirmReversible', true)
    const reloaded = await newStore()
    expect(reloaded.settings.confirmReversible).toBe(true)
  })
})
