<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppDialog from '../components/base/AppDialog.vue'
import AppIcon from '../components/base/AppIcon.vue'
import type { IconName } from '../components/base/icons'
import { confirmAction } from '../stores/confirm'
import { useGameStore } from '../stores/game'
import { useSettingsStore, type Settings as SettingsValues } from '../stores/settings'
import { formatNumber } from '../i18n/format'

type BooleanKey = 'sound' | 'haptics' | 'animations' | 'privacy' | 'confirmReversible' | 'autoResume'

const { t, locale } = useI18n()
const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()
const about = ref(false)
const cleared = ref(false)
const version = __APP_VERSION__

const num = (value: number): string => formatNumber(value, locale.value)
const rows = computed<Array<{ key: BooleanKey; icon: IconName; label: string; hint: string }>>(() => [
  { key: 'sound', icon: 'volume', label: t('settings.sound'), hint: '' },
  { key: 'haptics', icon: 'vibrate', label: t('settings.haptics'), hint: '' },
  { key: 'animations', icon: 'sparkles', label: t('settings.animations'), hint: '' },
  { key: 'privacy', icon: 'lock', label: t('settings.privacy'), hint: t('settings.privacyHint') },
  {
    key: 'confirmReversible',
    icon: 'shield',
    label: t('settings.confirmReversible'),
    hint: t('settings.confirmReversibleHint'),
  },
  {
    key: 'autoResume',
    icon: 'play',
    label: t('settings.autoResume'),
    hint: t('settings.autoResumeHint'),
  },
])

function set<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]): void {
  settings.set(key, value)
}

function toggle(key: BooleanKey): void {
  set(key, !settings.settings[key])
}

function onScale(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) set('boardScale', Math.min(1.1, Math.max(0.85, value)))
}

async function clearSave(): Promise<void> {
  const first = await confirmAction({
    title: t('settings.clearTitle'),
    message: t('settings.clearBody'),
    confirmLabel: t('settings.clearSave'),
    required: true,
    danger: true,
  })
  if (!first) return
  const second = await confirmAction({
    title: t('settings.clearAgainTitle'),
    message: t('settings.clearAgainBody'),
    confirmLabel: t('settings.clearSave'),
    required: true,
    danger: true,
  })
  if (!second) return
  await game.discardGame()
  cleared.value = true
}
</script>

<template>
  <div class="page safe-x safe-top">
    <header class="flex items-center gap-2">
      <button type="button" class="icon-btn" :aria-label="t('common.back')" @click="router.back()">
        <AppIcon name="back" :size="20" />
      </button>
      <h1 class="text-xl font-bold">{{ t('settings.title') }}</h1>
    </header>

    <section class="panel mt-4 p-3">
      <h2 class="eyebrow">{{ t('settings.language') }}</h2>
      <p class="mt-0.5 text-xs text-muted">{{ t('settings.languageHint') }}</p>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          class="btn btn-secondary"
          :class="settings.settings.locale === 'en' ? '!border-gold !text-gold' : ''"
          :aria-pressed="settings.settings.locale === 'en'"
          @click="set('locale', 'en')"
        >
          English
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :class="settings.settings.locale === 'fa' ? '!border-gold !text-gold' : ''"
          :aria-pressed="settings.settings.locale === 'fa'"
          @click="set('locale', 'fa')"
        >
          فارسی
        </button>
      </div>
    </section>

    <section class="panel mt-3 p-3">
      <h2 class="eyebrow">{{ t('settings.theme') }}</h2>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          class="btn btn-secondary gap-2"
          :class="settings.settings.theme === 'dark' ? '!border-gold !text-gold' : ''"
          :aria-pressed="settings.settings.theme === 'dark'"
          @click="set('theme', 'dark')"
        >
          <AppIcon name="moon" :size="17" />
          {{ t('settings.themeDark') }}
        </button>
        <button
          type="button"
          class="btn btn-secondary gap-2"
          :class="settings.settings.theme === 'light' ? '!border-gold !text-gold' : ''"
          :aria-pressed="settings.settings.theme === 'light'"
          @click="set('theme', 'light')"
        >
          <AppIcon name="sun" :size="17" />
          {{ t('settings.themeLight') }}
        </button>
      </div>
      <div class="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div class="min-w-0">
          <p class="text-sm font-bold">{{ t('settings.contrast') }}</p>
          <p class="text-xs text-muted">
            {{ settings.settings.contrast === 'high' ? t('settings.contrastHigh') : t('settings.contrastNormal') }}
          </p>
        </div>
        <button
          type="button"
          class="switch"
          role="switch"
          :aria-checked="settings.settings.contrast === 'high'"
          :aria-label="t('settings.contrast')"
          @click="set('contrast', settings.settings.contrast === 'high' ? 'normal' : 'high')"
        />
      </div>
    </section>

    <section class="panel mt-3 divide-y divide-line p-3">
      <div v-for="row in rows" :key="row.key" class="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
        <div class="flex min-w-0 items-start gap-2">
          <AppIcon :name="row.icon" :size="18" class="mt-0.5 shrink-0 text-muted" />
          <div class="min-w-0">
            <p class="text-sm font-bold">{{ row.label }}</p>
            <p v-if="row.hint" class="text-xs text-muted">{{ row.hint }}</p>
          </div>
        </div>
        <button
          type="button"
          class="switch"
          role="switch"
          :aria-checked="settings.settings[row.key]"
          :aria-label="row.label"
          @click="toggle(row.key)"
        />
      </div>
    </section>

    <section class="panel mt-3 p-3">
      <h2 class="eyebrow">{{ t('settings.orientation') }}</h2>
      <div class="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          class="btn btn-secondary"
          :class="settings.settings.orientation === 'auto' ? '!border-gold !text-gold' : ''"
          :aria-pressed="settings.settings.orientation === 'auto'"
          @click="set('orientation', 'auto')"
        >
          {{ t('settings.orientationAuto') }}
        </button>
        <button
          type="button"
          class="btn btn-secondary"
          :class="settings.settings.orientation === 'landscape' ? '!border-gold !text-gold' : ''"
          :aria-pressed="settings.settings.orientation === 'landscape'"
          @click="set('orientation', 'landscape')"
        >
          {{ t('settings.orientationLandscape') }}
        </button>
      </div>
      <div class="mt-3 border-t border-line pt-3">
        <div class="flex items-center justify-between gap-2">
          <label for="board-scale" class="text-sm font-bold">{{ t('settings.boardScale') }}</label>
          <span class="chip">{{ num(Math.round(settings.settings.boardScale * 100)) }}%</span>
        </div>
        <input
          id="board-scale"
          class="mt-2 w-full accent-[var(--gold)]"
          type="range"
          min="0.85"
          max="1.1"
          step="0.05"
          :value="settings.settings.boardScale"
          @input="onScale"
        />
        <p class="mt-1 text-xs text-muted">{{ t('settings.boardScaleHint') }}</p>
      </div>
    </section>

    <section v-if="game.hasSave || game.state" class="panel mt-3 p-3">
      <h2 class="eyebrow">{{ t('settings.clearSave') }}</h2>
      <p class="mt-1 text-xs text-muted">{{ t('settings.clearSaveHint') }}</p>
      <p v-if="cleared" class="mt-2 text-sm font-semibold text-gold">{{ t('settings.cleared') }}</p>
      <button type="button" class="btn btn-danger mt-2 w-full" @click="clearSave">
        <AppIcon name="trash" :size="18" />
        {{ t('settings.clearSave') }}
      </button>
    </section>

    <section class="panel mt-3 p-3">
      <button type="button" class="btn btn-secondary w-full" @click="about = true">
        <AppIcon name="book" :size="18" />
        {{ t('settings.about') }}
      </button>
      <p class="mt-2 text-center text-[0.68rem] text-muted">
        {{ t('settings.version', { version }) }}
      </p>
    </section>

    <AppDialog :open="about" :title="t('about.title')" @close="about = false">
      <p class="text-sm leading-relaxed">{{ t('about.body') }}</p>
      <p class="mt-2 text-sm leading-relaxed text-muted">{{ t('about.attribution') }}</p>
      <p class="mt-2 text-sm leading-relaxed text-muted">{{ t('about.expansionAttribution') }}</p>
      <p class="mt-2 text-sm leading-relaxed text-muted">{{ t('about.license') }}</p>
      <p class="mt-2 text-xs text-muted">{{ t('about.source') }}</p>
      <template #actions>
        <button type="button" class="btn btn-primary" @click="about = false">
          {{ t('common.close') }}
        </button>
      </template>
    </AppDialog>
  </div>
</template>
