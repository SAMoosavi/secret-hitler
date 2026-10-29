<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppIcon from '../components/base/AppIcon.vue'
import { confirmAction } from '../stores/confirm'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { knowledgeFor } from '../game/engine'
import { feedback } from '../platform/feedback'
import { formatNumber } from '../i18n/format'
import type { Role } from '../game/types'

const { t, locale } = useI18n()
const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()

const shown = ref(false)
const num = (value: number): string => formatNumber(value, locale.value)
const state = computed(() => game.state)
const player = computed(() => {
  const current = state.value
  if (!current || current.phase !== 'roleReveal') return null
  return current.players[current.revealIndex] ?? null
})
const knowledge = computed(() => {
  const current = state.value
  if (!current || !player.value) return null
  return knowledgeFor(current, player.value.id)
})
const total = computed(() => state.value?.players.length ?? 0)
const isLast = computed(() => !!state.value && state.value.revealIndex + 1 >= state.value.players.length)
const role = computed<Role>(() => player.value?.role ?? 'liberal')
const roleClass = computed(() =>
  role.value === 'liberal' ? 'border-liberal/60 bg-liberal/15 text-liberal' : 'border-fascist/60 bg-fascist/15 text-fascist',
)

watch(
  () => game.state?.phase,
  (phase) => {
    if (!phase) {
      void router.replace('/')
      return
    }
    if (phase !== 'roleReveal') void router.replace('/game')
  },
  { immediate: true },
)

onMounted(() => {
  // This screen already gates the role behind "pass the phone", so the resume
  // interstitial is satisfied here rather than in the game board.
  game.acknowledgeRestore()
})

function reveal(): void {
  if (!player.value) return
  shown.value = true
  feedback('reveal', settings.settings)
}

async function hide(): Promise<void> {
  if (!player.value || game.busy) return
  const ok = await confirmAction({
    title: t('reveal.hideTitle'),
    message: isLast ? t('reveal.hideBodyLast') : t('reveal.hideBody'),
    confirmLabel: t('reveal.hideConfirm'),
    required: true,
    danger: true,
  })
  if (!ok) return
  shown.value = false
  const committed = await game.commit({ type: 'nextReveal' })
  feedback(committed ? 'success' : 'error', settings.settings)
}

async function exit(): Promise<void> {
  const ok = await confirmAction({
    title: t('game.exitTitle'),
    message: t('game.exitBody'),
    confirmLabel: t('game.exitConfirm'),
    required: true,
    danger: true,
  })
  if (ok) await router.push('/')
}
</script>

<template>
  <div v-if="player" class="page flex min-h-dvh flex-col safe-x safe-top">
    <header class="flex items-center justify-between gap-2">
      <button type="button" class="icon-btn" :aria-label="t('game.menu')" @click="exit">
        <AppIcon name="back" :size="20" />
      </button>
      <div class="text-center">
        <p class="eyebrow">{{ t('reveal.title') }}</p>
        <p class="text-xs font-bold text-muted">
          {{ t('reveal.progress', { current: num(state!.revealIndex + 1), total: num(total) }) }}
        </p>
      </div>
      <span class="w-12" aria-hidden="true" />
    </header>

    <div class="flex flex-1 flex-col justify-center py-6">
      <section v-if="!shown" class="flex flex-col items-center text-center">
        <span
          class="flex h-20 w-20 items-center justify-center rounded-full border border-line bg-surface-2 text-gold shadow-lg"
        >
          <AppIcon name="user" :size="40" />
        </span>
        <h1 class="mt-4 text-2xl font-bold">{{ t('reveal.passTo', { name: player.name }) }}</h1>
        <p class="mt-2 max-w-xs text-sm text-muted">{{ t('reveal.handoff', { name: player.name }) }}</p>
        <button type="button" class="btn btn-primary btn-lg mt-6 w-full max-w-sm" @click="reveal">
          <AppIcon name="eye" :size="20" />
          {{ t('reveal.ready', { name: player.name }) }}
        </button>
        <p class="mt-4 flex items-center gap-1.5 text-xs text-muted">
          <AppIcon name="lock" :size="13" />
          {{ t('reveal.privacy') }}
        </p>
      </section>

      <section v-else class="flex flex-col items-center">
        <p class="eyebrow">{{ t('reveal.roleTitle') }}</p>
        <p class="mt-1 text-sm text-muted">{{ t('reveal.youAre') }}</p>
        <div class="panel-raised mt-2 w-full max-w-sm rounded-2xl border-2 p-5 text-center" :class="roleClass">
          <span class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-current/40">
            <AppIcon :name="role === 'liberal' ? 'sun' : 'crest'" :size="34" />
          </span>
          <h1 class="mt-3 text-4xl font-bold">{{ t(`reveal.${role}`) }}</h1>
          <p class="mt-1 text-sm font-extrabold uppercase tracking-widest">
            {{ role === 'liberal' ? t('reveal.teamLiberal') : t('reveal.teamFascist') }}
          </p>
        </div>

        <div class="panel mt-3 w-full max-w-sm p-3 text-start">
          <p class="eyebrow">{{ t('reveal.knowledgeTitle') }}</p>
          <template v-if="knowledge">
            <p v-if="knowledge.role === 'liberal'" class="mt-1 text-sm text-muted">
              {{ t('reveal.noKnowledge') }}
            </p>
            <template v-else>
              <p v-if="knowledge.hitler" class="mt-1 text-sm font-semibold">
                {{ t('reveal.knowsHitler', { name: knowledge.hitler }) }}
              </p>
              <p v-if="knowledge.fascists.length" class="mt-1 text-sm font-semibold">
                {{ t('reveal.knowsFascists', { names: knowledge.fascists.join(locale === 'fa' ? '، ' : ', ') }) }}
              </p>
              <p v-if="!knowledge.hitler && !knowledge.fascists.length" class="mt-1 text-sm text-muted">
                {{ t('reveal.hitlerUnknown') }}
              </p>
            </template>
          </template>
        </div>

        <button
          type="button"
          class="btn btn-primary btn-lg mt-5 w-full max-w-sm"
          :disabled="game.busy"
          @click="hide"
        >
          <AppIcon name="lock" :size="20" />
          {{ isLast ? t('reveal.last') : t('reveal.hide') }}
        </button>
        <p class="mt-3 flex items-center gap-1.5 text-xs text-muted">
          <AppIcon name="lock" :size="13" />
          {{ t('reveal.privacy') }}
        </p>
      </section>
    </div>
  </div>
</template>
