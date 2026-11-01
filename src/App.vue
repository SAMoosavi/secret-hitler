<script setup lang="ts">
import { onMounted, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppIcon from './components/base/AppIcon.vue'
import ConfirmDialog from './components/base/ConfirmDialog.vue'
import { useGameStore } from './stores/game'
import { useSettingsStore } from './stores/settings'

const { t } = useI18n()
const router = useRouter()
const settings = useSettingsStore()
const game = useGameStore()

watchEffect(() => {
  document.title = `${t('appTitle')} · ${t('appSubtitle')}`
})

onMounted(async () => {
  await router.isReady()
  if (router.currentRoute.value.path !== '/') return
  if (!settings.settings.autoResume || !game.state) return
  await router.replace(game.state.phase === 'roleReveal' ? '/reveal' : '/game')
})
</script>

<template>
  <a
    href="#main"
    class="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:m-2 focus:rounded focus:bg-surface focus:p-3 focus:text-ink"
  >
    {{ t('a11y.skipToContent') }}
  </a>

  <main id="main">
    <RouterView />
  </main>

  <div
    v-if="game.saveError"
    class="fixed inset-x-3 bottom-3 z-40 flex items-center gap-3 rounded-xl border border-danger/60 bg-surface p-3 shadow-lg safe-bottom"
    role="alert"
  >
    <AppIcon name="x" :size="18" class="shrink-0 text-danger" />
    <p class="min-w-0 flex-1 text-sm font-semibold">{{ t(game.saveError) }}</p>
    <button type="button" class="btn btn-secondary btn-sm" @click="game.clearErrors()">
      {{ t('common.dismiss') }}
    </button>
  </div>

  <ConfirmDialog />
</template>
