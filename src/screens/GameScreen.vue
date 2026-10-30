<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import AppIcon from '../components/base/AppIcon.vue'
import GameBoard from '../components/board/GameBoard.vue'
import VotingPanel from '../components/game/VotingPanel.vue'
import LegislativePanel from '../components/game/LegislativePanel.vue'
import ExecutivePanel from '../components/game/ExecutivePanel.vue'
import RadicalisationPanel from '../components/game/RadicalisationPanel.vue'
import ConfessionPanel from '../components/game/ConfessionPanel.vue'
import GameOverPanel from '../components/game/GameOverPanel.vue'
import { eligibility, eligibilities, secretStep } from '../game/engine'
import { confirmAction } from '../stores/confirm'
import { useGameStore } from '../stores/game'
import { useSettingsStore } from '../stores/settings'
import { feedback } from '../platform/feedback'
import { lockGameOrientation, unlockGameOrientation } from '../platform/orientation'
import { formatNumber } from '../i18n/format'
import type { GameAction, RuleError } from '../game/types'

const { t, locale } = useI18n()
const router = useRouter()
const game = useGameStore()
const settings = useSettingsStore()

const selectedId = ref<number | null>(null)
// A resumed save can reopen a private phase (a reveal, a secret action or a
// hidden executive result), so the board stays behind a cover until the
// operator confirms. Native dialogs render in the top layer, so the panels are
// unmounted while covered.
const shield = ref(
  game.restored ||
    (!!game.state &&
      (game.state.phase === 'roleReveal' ||
        game.state.phase === 'communistPower' ||
        game.state.phase === 'radicalisationReveal' ||
        secretStep(game.state) !== null ||
        (game.state.phase === 'executive' &&
          (!!game.state.investigation || !!game.state.peeked)))),
)

const state = computed(() => game.state)
const view = computed(() => game.publicView)
const list = computed(() => (state.value ? eligibilities(state.value) : []))
const num = (value: number): string => formatNumber(value, locale.value)
const announcement = computed(() => {
  if (!view.value) return ''
  const parts = [t(`phases.${view.value.phase}`)]
  if (view.value.lastElection) {
    parts.push(t(view.value.lastElection.approved ? 'game.approved' : 'game.rejected'))
  }
  if (view.value.gameOver) parts.push(t(`gameOver.${view.value.gameOver.reason}`))
  return parts.join('. ')
})
const selected = computed(() =>
  selectedId.value === null ? null : (state.value?.players.find((p) => p.id === selectedId.value) ?? null),
)
const selectedEligible = computed(
  () => !!state.value && selectedId.value !== null && eligibility(state.value, selectedId.value).eligible,
)

watch(
  () => game.state?.phase,
  (phase) => {
    selectedId.value = null
    if (!phase) void router.replace('/')
    else if (phase === 'roleReveal') void router.replace('/reveal')
  },
  { immediate: true },
)

onMounted(() => {
  void lockGameOrientation(settings.settings.orientation)
  document.addEventListener('visibilitychange', onVisibility)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  unlockGameOrientation()
})

// Android may drop the requested orientation after backgrounding the app.
function onVisibility(): void {
  if (document.visibilityState === 'visible') {
    void lockGameOrientation(settings.settings.orientation)
  }
}

onBeforeRouteLeave(async (to) => {
  if (to.path !== '/' || !game.state || game.state.phase === 'gameOver') return true
  return confirmAction({
    title: t('game.exitTitle'),
    message: t('game.exitBody'),
    confirmLabel: t('game.exitConfirm'),
    required: true,
    danger: true,
  })
})

function ruleMessage(error: RuleError): string {
  return t(`rules.${error.code}`, error.params ?? {})
}

async function act(action: GameAction): Promise<void> {
  if (game.busy) return
  const ok = await game.commit(action)
  feedback(ok ? 'success' : 'error', settings.settings)
}

async function nominate(): Promise<void> {
  if (!selected.value || !selectedEligible.value || game.busy) return
  const name = selected.value.name
  const ok = await confirmAction({
    title: t('nomination.confirmTitle', { name }),
    message: t('nomination.confirmBody'),
    confirmLabel: t('nomination.submit'),
  })
  if (!ok) return
  await act({ type: 'nominate', playerId: selected.value.id })
}

async function exit(): Promise<void> {
  await router.push('/')
}

function showBoard(): void {
  shield.value = false
  game.acknowledgeRestore()
}
</script>

<template>
  <div v-if="state && view" class="page page-wide game-layout min-h-dvh safe-x safe-top">
    <header class="flex items-center gap-2">
      <div class="min-w-0 flex-1">
        <p class="eyebrow flex items-center gap-1.5">
          <AppIcon name="crest" :size="12" />
          {{ t('game.title') }}
        </p>
        <h1 class="truncate text-xl font-bold">
          {{ t('game.round', { n: num(state.round) }) }}
          <span class="text-sm font-semibold text-muted">· {{ t(`phases.${view.phase}`) }}</span>
        </h1>
      </div>
      <RouterLink to="/how-to-play" class="icon-btn" :aria-label="t('game.help')">
        <AppIcon name="help" :size="19" />
      </RouterLink>
      <RouterLink to="/settings" class="icon-btn" :aria-label="t('menu.settings')">
        <AppIcon name="settings" :size="19" />
      </RouterLink>
      <button type="button" class="icon-btn" :aria-label="t('game.exit')" @click="exit">
        <AppIcon name="back" :size="20" />
      </button>
    </header>

    <p class="sr-only" role="status" aria-live="polite">{{ announcement }}</p>

    <div class="rotate-hint mt-2 items-center gap-2 rounded-lg border border-gold/40 bg-gold/10 p-2 text-xs">
      <AppIcon name="rotate" :size="18" class="shrink-0 text-gold" />
      <div>
        <p class="font-bold">{{ t('game.rotate') }}</p>
        <p class="text-muted">{{ t('game.rotateHint') }}</p>
      </div>
    </div>

    <p
      v-if="game.lastError"
      class="mt-2 flex items-center gap-2 rounded-lg border border-danger/50 bg-surface p-2 text-sm font-semibold"
      role="alert"
    >
      <AppIcon name="x" :size="16" class="shrink-0 text-danger" />
      <span class="min-w-0 flex-1">{{ ruleMessage(game.lastError) }}</span>
      <button type="button" class="btn btn-secondary btn-sm" @click="game.clearErrors()">
        {{ t('common.dismiss') }}
      </button>
    </p>

    <div class="game-grid mt-3 grid gap-3 landscape:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <GameBoard
        :view="view"
        :eligibilities="list"
        :selectable="view.phase === 'nomination'"
        :selected-id="selectedId"
        @select="selectedId = $event"
      />

      <div class="flex flex-col gap-3 game-actions">
        <section v-if="view.phase === 'nomination'" class="panel p-3">
          <h2 class="text-lg font-bold">{{ t('nomination.title') }}</h2>
          <p class="mt-0.5 text-xs text-muted">{{ t('nomination.hint') }}</p>
          <p
            v-if="selected"
            class="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-2 text-sm font-bold"
          >
            {{ t('nomination.choose', { name: selected.name }) }}
          </p>
          <p v-else class="mt-3 text-sm text-muted">{{ t('game.noNominee') }}</p>
          <p v-if="list.every((entry) => !entry.eligible)" class="mt-2 text-sm text-danger">
            {{ t('nomination.none') }}
          </p>
          <button
            type="button"
            class="btn btn-primary mt-3 w-full"
            :disabled="!selected || !selectedEligible || game.busy"
            @click="nominate"
          >
            <AppIcon name="ballot" :size="18" />
            {{ t('nomination.submit') }}
          </button>
        </section>

        <VotingPanel
          v-else-if="view.phase === 'voting'"
          :busy="game.busy"
          @vote="act({ type: 'vote', approved: $event })"
        />

        <section v-else-if="view.phase !== 'gameOver'" class="panel p-3">
          <p class="eyebrow">{{ t('game.phase') }}</p>
          <p class="mt-1 text-lg font-bold">{{ t(`phases.${view.phase}`) }}</p>
          <p v-if="view.phase !== 'radicalisationReveal'" class="mt-1 text-xs text-muted">
            {{
              view.phase === 'executive' || view.phase === 'communistPower'
                ? t('game.powerInfo')
                : t('reveal.privacy')
            }}
          </p>
        </section>

        <p class="text-[0.65rem] text-muted">
          {{ t('voting.note') }}
        </p>
      </div>
    </div>

    <LegislativePanel
      v-if="!shield && (state.phase === 'legislativePresident' || state.phase === 'legislativeChancellor')"
      :state="state"
      :busy="game.busy"
      @discard="act({ type: 'presidentDiscard', index: $event })"
      @enact="act({ type: 'chancellorEnact', index: $event })"
      @request-veto="act({ type: 'requestVeto' })"
      @veto="act({ type: 'vetoResponse', accept: $event })"
    />

    <ExecutivePanel
      v-if="
        !shield &&
        (state.phase === 'executive' ||
          (state.phase === 'communistPower' && state.pendingAction?.type === 'fiveYearPlan'))
      "
      :state="state"
      :busy="game.busy"
      @investigate="act({ type: 'investigate', playerId: $event })"
      @acknowledge-investigation="act({ type: 'acknowledgeInvestigation' })"
      @acknowledge-peek="act({ type: 'acknowledgePeek' })"
      @special-election="act({ type: 'specialElection', playerId: $event })"
      @execute="act({ type: 'execute', playerId: $event })"
      @acknowledge-five-year-plan="act({ type: 'acknowledgeFiveYearPlan' })"
    />

    <RadicalisationPanel
      v-if="
        !shield &&
        (state.phase === 'radicalisationReveal' ||
          (state.phase === 'communistPower' && state.pendingAction?.type === 'radicalise'))
      "
      :state="state"
      :busy="game.busy"
      @radicalise="act({ type: 'radicalise', playerId: $event })"
      @next-reveal="act({ type: 'nextRadicalisationReveal' })"
      @finish="act({ type: 'finishRadicalisation' })"
    />

    <ConfessionPanel
      v-if="
        !shield &&
        state.phase === 'communistPower' &&
        state.pendingAction?.type === 'confession'
      "
      :state="state"
      :busy="game.busy"
      @acknowledge="act({ type: 'acknowledgeConfession' })"
    />

    <GameOverPanel v-if="!shield && state.phase === 'gameOver'" :state="state" />

    <div v-if="shield" class="privacy-cover">
      <div class="flex flex-col items-center gap-4">
        <span class="flex h-16 w-16 items-center justify-center rounded-full border border-line bg-surface">
          <AppIcon name="lock" :size="30" class="text-gold" />
        </span>
        <p class="text-lg font-bold">{{ t('privacy.restoreTitle') }}</p>
        <p class="max-w-xs text-sm text-muted">{{ t('privacy.restoreHint') }}</p>
        <button type="button" class="btn btn-primary" @click="showBoard">
          <AppIcon name="eye" :size="18" />
          {{ t('privacy.tap') }}
        </button>
      </div>
    </div>
  </div>
</template>
