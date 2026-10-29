<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppIcon from '../components/base/AppIcon.vue'
import { confirmAction } from '../stores/confirm'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { formatNumber } from '../i18n/format'

const { t, locale } = useI18n()
const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()
const version = __APP_VERSION__

const num = (value: number): string => formatNumber(value, locale.value)
const savedLabel = computed(() => {
  const state = game.state
  if (!state) return ''
  return t('menu.savedGame', { count: num(state.playerCount), round: num(state.round) })
})
const loadErrorText = computed(() => {
  if (game.loadError === 'tooNew') return t('errors.loadTooNew')
  if (game.loadError === 'corrupt') return t('errors.loadCorrupt')
  return ''
})

async function start(): Promise<void> {
  if (game.hasSave) {
    const ok = await confirmAction({
      title: t('menu.replaceTitle'),
      message: t('menu.replaceBody'),
      confirmLabel: t('menu.start'),
      required: true,
      danger: true,
    })
    if (!ok) return
  }
  await router.push('/setup')
}

async function clearSave(): Promise<void> {
  const ok = await confirmAction({
    title: t('settings.clearTitle'),
    message: t('settings.clearBody'),
    confirmLabel: t('settings.clearSave'),
    required: true,
    danger: true,
  })
  if (ok) await game.discardGame()
}

async function resume(): Promise<void> {
  if (!game.state) return
  await router.push(game.state.phase === 'roleReveal' ? '/reveal' : '/game')
}

function cycleLocale(): void {
  settings.set('locale', settings.settings.locale === 'fa' ? 'en' : 'fa')
}

function cycleTheme(): void {
  settings.set('theme', settings.settings.theme === 'dark' ? 'light' : 'dark')
}
</script>

<template>
  <div class="page flex min-h-dvh flex-col safe-x safe-top">
    <header class="flex justify-end gap-2">
      <button
        type="button"
        class="icon-btn !w-auto gap-1.5 px-3 text-sm font-bold"
        :aria-label="t('menu.language')"
        @click="cycleLocale"
      >
        <AppIcon name="globe" :size="18" />
        {{ settings.settings.locale === 'fa' ? 'فا' : 'EN' }}
      </button>
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('menu.theme')"
        @click="cycleTheme"
      >
        <AppIcon :name="settings.settings.theme === 'dark' ? 'moon' : 'sun'" :size="19" />
      </button>
    </header>

    <div class="flex flex-1 flex-col items-center justify-center py-6 text-center">
      <span
        class="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-gold/50 bg-gold/10 text-gold shadow-lg"
      >
        <AppIcon name="crest" :size="44" />
      </span>
      <p class="eyebrow">{{ t('appSubtitle') }}</p>
      <h1 class="mt-1 text-4xl font-bold sm:text-5xl">{{ t('appTitle') }}</h1>
      <p class="mt-3 max-w-sm text-sm text-muted">{{ t('appTagline') }}</p>

      <div class="mt-8 grid w-full max-w-sm gap-2">
        <button type="button" class="btn btn-primary btn-lg" @click="start">
          <AppIcon name="play" :size="20" />
          {{ t('menu.start') }}
        </button>

        <button v-if="game.state" type="button" class="btn btn-secondary btn-lg" @click="resume">
          <AppIcon name="chevron" :size="20" />
          <span class="flex flex-col items-start">
            <span>{{ t('menu.resume') }}</span>
            <span class="text-[0.68rem] font-semibold text-muted">{{ savedLabel }}</span>
          </span>
        </button>

        <button type="button" class="btn btn-secondary" @click="router.push('/how-to-play')">
          <AppIcon name="book" :size="18" />
          {{ t('menu.howToPlay') }}
        </button>
        <button type="button" class="btn btn-ghost" @click="router.push('/settings')">
          <AppIcon name="settings" :size="18" />
          {{ t('menu.settings') }}
        </button>
      </div>

      <div
        v-if="loadErrorText"
        class="mt-4 w-full max-w-sm rounded-xl border border-danger/50 bg-surface p-3 text-start text-sm"
        role="alert"
      >
        <p class="font-semibold">{{ loadErrorText }}</p>
        <button
          type="button"
          class="btn btn-danger btn-sm mt-2"
          @click="clearSave"
        >
          <AppIcon name="trash" :size="16" />
          {{ t('settings.clearSave') }}
        </button>
      </div>
    </div>

    <footer class="pb-2 text-center text-[0.68rem] text-muted">
      <p>{{ t('menu.footer') }}</p>
      <p class="mt-1">{{ t('settings.version', { version }) }}</p>
    </footer>
  </div>
</template>
