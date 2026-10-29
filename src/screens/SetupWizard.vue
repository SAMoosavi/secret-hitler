<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import AppIcon from '../components/base/AppIcon.vue'
import { confirmAction } from '../stores/confirm'
import { useGameStore } from '../stores/game'
import { formatNumber } from '../i18n/format'
import {
  DECK_FASCIST,
  DECK_LIBERAL,
  DECK_TOTAL,
  HAND_SIZE,
  roleCounts,
} from '../game/constants'

const { t, locale } = useI18n()
const router = useRouter()
const game = useGameStore()

const STEP_COUNT = 5
const step = ref(0)
const count = ref(7)
const names = ref<string[]>(Array.from({ length: 7 }, () => ''))
const leaving = ref(false)

const num = (value: number): string => formatNumber(value, locale.value)
const counts = computed(() => roleCounts(count.value)!)
const steps = computed(() => [
  t('setup.stepPlayers'),
  t('setup.stepNames'),
  t('setup.stepRoles'),
  t('setup.stepComponents'),
  t('setup.stepReview'),
])
const variant = computed(() => {
  const min = count.value <= 6 ? 5 : count.value <= 8 ? 7 : 9
  return t('setup.variant', { min: num(min), max: num(min + 1) })
})

const duplicate = computed(() => {
  const seen = new Map<string, number>()
  for (const [index, raw] of names.value.entries()) {
    const key = raw.trim() ? raw.trim().toLocaleLowerCase() : `player ${index + 1}`
    const first = seen.get(key)
    if (first !== undefined) {
      const shown = names.value[first].trim() || t('setup.namePlaceholder', { n: num(first + 1) })
      return shown
    }
    seen.set(key, index)
  }
  return null
})

const canAdvance = computed(() => step.value !== 1 || duplicate.value === null)
const errorText = computed(() => {
  if (game.saveError) return t(game.saveError)
  if (game.lastError?.code === 'duplicateNames') {
    return t('rules.duplicateNames', game.lastError.params ?? {})
  }
  return ''
})

watch(count, (next) => {
  const current = [...names.value]
  while (current.length < next) current.push('')
  names.value = current.slice(0, next)
})

function previous(): void {
  if (step.value > 0) {
    step.value -= 1
    return
  }
  void leave()
}

function next(): void {
  if (!canAdvance.value || step.value >= STEP_COUNT - 1) return
  step.value += 1
}

async function leave(): Promise<boolean> {
  const ok = await confirmAction({
    title: t('setup.backTitle'),
    message: t('setup.backBody'),
    confirmLabel: t('common.back'),
    required: true,
    danger: true,
  })
  if (!ok) return false
  leaving.value = true
  await router.push('/')
  return true
}

async function create(): Promise<void> {
  if (game.busy) return
  const ok = await confirmAction({
    title: t('setup.confirmTitle'),
    message: t('setup.confirmBody'),
    confirmLabel: t('setup.start'),
    required: true,
  })
  if (!ok) return
  const started = await game.startGame({ playerCount: count.value, names: [...names.value] })
  if (!started) return
  leaving.value = true
  await router.replace('/reveal')
}

onBeforeRouteLeave(async () => {
  if (leaving.value) return true
  const ok = await confirmAction({
    title: t('setup.backTitle'),
    message: t('setup.backBody'),
    confirmLabel: t('common.back'),
    required: true,
    danger: true,
  })
  if (ok) leaving.value = true
  return ok
})
</script>

<template>
  <div class="page flex min-h-dvh flex-col safe-x safe-top">
    <header class="flex items-center gap-2">
      <button
        type="button"
        class="icon-btn"
        :aria-label="t('common.back')"
        @click="previous"
      >
        <AppIcon name="back" :size="20" />
      </button>
      <div class="min-w-0 flex-1">
        <p class="eyebrow">{{ t('common.step', { current: num(step + 1), total: num(STEP_COUNT) }) }}</p>
        <h1 class="truncate text-xl font-bold">{{ t('setup.title') }}</h1>
      </div>
    </header>

    <ol class="mt-3 flex gap-1" :aria-label="t('setup.title')">
      <li
        v-for="(label, index) in steps"
        :key="label"
        class="flex-1 border-t-2 pt-1 text-[0.6rem] font-bold uppercase tracking-wide"
        :class="index <= step ? 'border-gold text-gold' : 'border-line text-muted'"
      >
        <span class="line-clamp-2">{{ label }}</span>
      </li>
    </ol>

    <div class="mt-5 flex-1">
      <section v-if="step === 0">
        <h2 class="text-2xl font-bold">{{ t('setup.playersTitle') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('setup.playersHint') }}</p>
        <div class="mt-4 grid grid-cols-3 gap-2">
          <button
            v-for="n in [5, 6, 7, 8, 9, 10]"
            :key="n"
            type="button"
            class="panel flex min-h-20 flex-col items-center justify-center gap-0.5"
            :class="count === n ? '!border-gold ring-2 ring-gold/40' : ''"
            :aria-pressed="count === n"
            @click="count = n"
          >
            <span class="text-2xl font-bold">{{ num(n) }}</span>
            <span class="text-[0.65rem] text-muted">{{ t('common.players') }}</span>
          </button>
        </div>
        <p class="mt-3 rounded-lg border border-line bg-surface-2/60 p-2.5 text-xs text-muted">
          {{ t('setup.playersMin') }}
        </p>
      </section>

      <section v-else-if="step === 1">
        <h2 class="text-2xl font-bold">{{ t('setup.namesTitle') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('setup.namesHint') }}</p>
        <ul class="mt-4 grid gap-2 sm:grid-cols-2">
          <li v-for="(_, index) in names" :key="index">
            <label class="field-label" :for="`player-name-${index}`">
              {{ t('setup.namePlaceholder', { n: num(index + 1) }) }}
            </label>
            <input
              :id="`player-name-${index}`"
              v-model="names[index]"
              class="input"
              type="text"
              maxlength="24"
              autocomplete="off"
              :placeholder="t('setup.namePlaceholder', { n: num(index + 1) })"
              :aria-invalid="duplicate !== null"
            />
          </li>
        </ul>
        <p v-if="duplicate" class="mt-3 rounded-lg border border-danger/50 bg-surface p-2.5 text-sm font-semibold text-danger" role="alert">
          {{ t('setup.duplicate', { name: duplicate }) }}
        </p>
      </section>

      <section v-else-if="step === 2">
        <h2 class="text-2xl font-bold">{{ t('setup.rolesTitle') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('setup.rolesHint', { count: num(count) }) }}</p>
        <div class="mt-4 grid gap-2">
          <div class="panel flex items-center justify-between gap-2 p-3">
            <span class="flex items-center gap-2 font-bold">
              <AppIcon name="sun" :size="18" class="text-liberal" />
              {{ t('setup.liberals') }}
            </span>
            <span class="text-2xl font-bold">{{ num(counts.liberal) }}</span>
          </div>
          <div class="panel flex items-center justify-between gap-2 p-3">
            <span class="flex items-center gap-2 font-bold">
              <AppIcon name="crest" :size="18" class="text-fascist" />
              {{ t('setup.fascists') }}
            </span>
            <span class="text-2xl font-bold">{{ num(counts.fascist) }}</span>
          </div>
          <div class="panel flex items-center justify-between gap-2 p-3">
            <span class="flex items-center gap-2 font-bold">
              <AppIcon name="crown" :size="18" class="text-gold" />
              {{ t('setup.hitler') }}
            </span>
            <span class="text-2xl font-bold">{{ num(1) }}</span>
          </div>
        </div>
        <p class="mt-3 rounded-lg border border-line bg-surface-2/60 p-2.5 text-xs text-muted">
          {{ count <= 6 ? t('setup.knowledgeFive') : t('setup.knowledgeMany') }}
        </p>
      </section>

      <section v-else-if="step === 3">
        <h2 class="text-2xl font-bold">{{ t('setup.componentsTitle') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('setup.componentsHint') }}</p>
        <dl class="mt-4 grid grid-cols-2 gap-2">
          <div class="panel p-3">
            <dt class="text-[0.68rem] font-bold uppercase text-muted">{{ t('setup.liberalTiles') }}</dt>
            <dd class="text-2xl font-bold">{{ num(DECK_LIBERAL) }}</dd>
          </div>
          <div class="panel p-3">
            <dt class="text-[0.68rem] font-bold uppercase text-muted">{{ t('setup.fascistTiles') }}</dt>
            <dd class="text-2xl font-bold">{{ num(DECK_FASCIST) }}</dd>
          </div>
          <div class="panel p-3">
            <dt class="text-[0.68rem] font-bold uppercase text-muted">{{ t('setup.deckTiles') }}</dt>
            <dd class="text-2xl font-bold">{{ num(DECK_TOTAL) }}</dd>
          </div>
          <div class="panel p-3">
            <dt class="text-[0.68rem] font-bold uppercase text-muted">{{ t('setup.handTiles') }}</dt>
            <dd class="text-2xl font-bold">{{ num(HAND_SIZE) }}</dd>
          </div>
        </dl>
        <p class="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm">
          {{ t('setup.physicalNote') }}
        </p>
      </section>

      <section v-else>
        <h2 class="text-2xl font-bold">{{ t('setup.reviewTitle') }}</h2>
        <p class="mt-1 text-sm text-muted">{{ t('setup.reviewHint') }}</p>
        <div class="panel mt-4 divide-y divide-line">
          <div class="flex items-center justify-between gap-2 p-3">
            <span class="text-sm text-muted">{{ t('setup.stepPlayers') }}</span>
            <span class="font-bold">{{ t('setup.summaryPlayers', { count: num(count) }) }}</span>
          </div>
          <div class="flex items-center justify-between gap-2 p-3">
            <span class="text-sm text-muted">{{ t('setup.stepRoles') }}</span>
            <span class="text-end font-bold">
              {{ t('setup.summaryRoles', { liberals: num(counts.liberal), fascists: num(counts.fascist) }) }}
            </span>
          </div>
          <div class="flex items-center justify-between gap-2 p-3">
            <span class="text-sm text-muted">{{ t('setup.stepComponents') }}</span>
            <span class="font-bold">{{ t('setup.summaryBoard', { variant }) }}</span>
          </div>
          <div class="p-3">
            <span class="text-sm text-muted">{{ t('setup.stepNames') }}</span>
            <ul class="mt-1 flex flex-wrap gap-1">
              <li v-for="(name, index) in names" :key="index" class="chip">
                {{ name.trim() || t('setup.namePlaceholder', { n: num(index + 1) }) }}
              </li>
            </ul>
          </div>
        </div>
      </section>

      <p
        v-if="errorText"
        class="mt-4 rounded-lg border border-danger/50 bg-surface p-2.5 text-sm font-semibold text-danger"
        role="alert"
      >
        {{ errorText }}
      </p>
    </div>

    <footer class="sticky bottom-0 mt-5 flex gap-2 bg-gradient-to-t from-canvas via-canvas/95 to-transparent py-3 safe-bottom">
      <button type="button" class="btn btn-ghost" @click="previous">
        {{ t('common.back') }}
      </button>
      <button
        v-if="step < STEP_COUNT - 1"
        type="button"
        class="btn btn-primary flex-1"
        :disabled="!canAdvance"
        @click="next"
      >
        {{ t('common.next') }}
        <AppIcon name="chevron" :size="18" class="flip-rtl" />
      </button>
      <button
        v-else
        type="button"
        class="btn btn-primary flex-1"
        :disabled="game.busy"
        @click="create"
      >
        <AppIcon name="play" :size="18" />
        {{ t('setup.start') }}
      </button>
    </footer>
  </div>
</template>
