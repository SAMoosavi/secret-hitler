<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppDialog from '../components/base/AppDialog.vue'
import AppIcon from '../components/base/AppIcon.vue'
import PageHeader from '../components/base/PageHeader.vue'
import type { IconName } from '../components/base/icons'
import SettingChoice from '../components/settings/SettingChoice.vue'
import SettingSection from '../components/settings/SettingSection.vue'
import SettingSwitchRow from '../components/settings/SettingSwitchRow.vue'
import { confirmAction } from '../stores/confirm'
import { useGameStore } from '../stores/game'
import { useSettingsStore, type Settings as SettingsValues } from '../stores/settings'
import { formatNumber } from '../i18n/format'

type BooleanKey = 'sound' | 'haptics' | 'animations' | 'confirmReversible' | 'autoResume'

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
const localeOptions = [
  { value: 'en', label: 'English' },
  { value: 'fa', label: 'فارسی' },
]
const themeOptions = computed(() => [
  { value: 'dark', label: t('settings.themeDark'), icon: 'moon' as const },
  { value: 'light', label: t('settings.themeLight'), icon: 'sun' as const },
])
const orientationOptions = computed(() => [
  { value: 'auto', label: t('settings.orientationAuto') },
  { value: 'landscape', label: t('settings.orientationLandscape') },
])

function set<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]): void {
  settings.set(key, value)
}

function onScale(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (Number.isFinite(value)) set('boardScale', Math.min(1, Math.max(0.85, value)))
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
    <PageHeader :title="t('settings.title')" @back="router.back()" />

    <SettingSection class="mt-4" :title="t('settings.language')" :hint="t('settings.languageHint')">
      <SettingChoice
        class="mt-2"
        :model-value="settings.settings.locale"
        :options="localeOptions"
        @update:model-value="set('locale', $event as SettingsValues['locale'])"
      />
    </SettingSection>

    <SettingSection class="mt-3" :title="t('settings.theme')">
      <SettingChoice
        class="mt-2"
        :model-value="settings.settings.theme"
        :options="themeOptions"
        @update:model-value="set('theme', $event as SettingsValues['theme'])"
      />
      <SettingSwitchRow
        class="mt-3 border-t border-line pt-3"
        :model-value="settings.settings.contrast === 'high'"
        :label="t('settings.contrast')"
        :hint="
          settings.settings.contrast === 'high' ? t('settings.contrastHigh') : t('settings.contrastNormal')
        "
        @update:model-value="set('contrast', $event ? 'high' : 'normal')"
      />
    </SettingSection>

    <section class="panel mt-3 divide-y divide-line p-3">
      <SettingSwitchRow
        v-for="row in rows"
        :key="row.key"
        class="py-2.5 first:pt-0 last:pb-0"
        :model-value="settings.settings[row.key]"
        :label="row.label"
        :hint="row.hint"
        :icon="row.icon"
        @update:model-value="set(row.key, $event)"
      />
    </section>

    <SettingSection class="mt-3" :title="t('settings.orientation')">
      <SettingChoice
        class="mt-2"
        :model-value="settings.settings.orientation"
        :options="orientationOptions"
        @update:model-value="set('orientation', $event as SettingsValues['orientation'])"
      />
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
          max="1"
          step="0.05"
          :value="settings.settings.boardScale"
          @input="onScale"
        />
        <p class="mt-1 text-xs text-muted">{{ t('settings.boardScaleHint') }}</p>
      </div>
    </SettingSection>

    <SettingSection
      v-if="game.hasSave || game.state"
      class="mt-3"
      :title="t('settings.clearSave')"
      :hint="t('settings.clearSaveHint')"
    >
      <p v-if="cleared" class="mt-2 text-sm font-semibold text-gold">{{ t('settings.cleared') }}</p>
      <button type="button" class="btn btn-danger mt-2 w-full" @click="clearSave">
        <AppIcon name="trash" :size="18" />
        {{ t('settings.clearSave') }}
      </button>
    </SettingSection>

    <footer class="mt-4 text-center">
      <button type="button" class="btn btn-secondary w-full" @click="about = true">
        <AppIcon name="book" :size="18" />
        {{ t('settings.about') }}
      </button>
      <p class="mt-2 text-xs text-muted">
        {{ t('settings.version', { version }) }}
      </p>
    </footer>

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
