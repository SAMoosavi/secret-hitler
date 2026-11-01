<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import PolicyCard from '../base/PolicyCard.vue'
import type { IconName } from '../base/icons'
import {
  COMMUNIST_TRACK,
  communistPowerFor,
  fascistTrackFor,
  liberalTrackFor,
  powerFor,
} from '../../game/constants'
import { formatNumber } from '../../i18n/format'
import type { Power } from '../../game/types'

const props = defineProps<{
  kind: 'liberal' | 'fascist' | 'communist'
  enacted: number
  playerCount: number
}>()
const emit = defineEmits<{ info: [power: Exclude<Power, 'none'>, index: number] }>()
const { t, locale } = useI18n()
const num = (value: number): string => formatNumber(value, locale.value)

const total = computed(() => {
  if (props.kind === 'liberal') return liberalTrackFor(props.playerCount)
  return props.kind === 'fascist' ? fascistTrackFor(props.playerCount) : COMMUNIST_TRACK
})
const title = computed(() => {
  if (props.kind === 'liberal') return t('game.liberalTrack')
  return props.kind === 'fascist' ? t('game.fascistTrack') : t('board.communistTrack')
})
const trackIcon = computed<IconName>(() =>
  props.kind === 'liberal' ? 'sun' : props.kind === 'fascist' ? 'crest' : 'star',
)

function powerAt(index: number): Power {
  if (props.kind === 'liberal') return 'none'
  if (props.kind === 'communist') return communistPowerFor(props.playerCount, index + 1)
  return powerFor(props.playerCount, index + 1)
}

/** A tap opens the power card; the Liberal track carries no powers. */
function interactive(index: number): boolean {
  return props.kind !== 'liberal' && powerAt(index) !== 'none'
}

function powerName(power: Power): string {
  switch (power) {
    case 'investigate':
      return t('executive.powerInvestigate')
    case 'peek':
      return t('executive.powerPeek')
    case 'special':
      return t('executive.powerSpecial')
    case 'execute':
      return t('executive.powerExecute')
    case 'radicalise':
      return t('setup.powerRadicalise')
    case 'fiveYearPlan':
      return t('setup.powerFiveYearPlan')
    case 'confession':
      return t('setup.powerConfession')
    default:
      return ''
  }
}

function spaceLabel(index: number): string {
  if (props.kind === 'communist') {
    if (index + 1 === total.value) return t('setup.powerVictory')
    const power = powerAt(index)
    return power === 'none' ? t('setup.powerBlank') : powerName(power)
  }
  const power = powerAt(index)
  if (index + 1 === total.value && props.kind === 'fascist') {
    return `${title.value} ${index + 1}`
  }
  if (power !== 'none') return `${t('a11y.powerSpace', { name: powerName(power) })}`
  return index < props.enacted ? t('a11y.enacted') : t('a11y.empty')
}

function spaceIcon(index: number): IconName | null {
  if (props.kind === 'communist') {
    if (index + 1 === total.value) return 'star'
    switch (powerAt(index)) {
      case 'radicalise':
        return 'sparkles'
      case 'fiveYearPlan':
        return 'cards'
      case 'confession':
        return 'eye'
      default:
        return null
    }
  }
  const power = powerAt(index)
  if (power !== 'none') {
    return power === 'investigate'
      ? 'eye'
      : power === 'peek'
        ? 'cards'
        : power === 'special'
          ? 'ballot'
          : 'dagger'
  }
  return props.kind === 'fascist' && index + 1 === total.value ? 'crown' : null
}

function activate(index: number): void {
  if (!interactive(index)) return
  emit('info', powerAt(index) as Exclude<Power, 'none'>, index)
}
</script>

<template>
  <section :aria-label="title" class="min-w-0">
    <header class="mb-0.5 flex items-center justify-between gap-2 px-0.5">
      <span
        class="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-ink-on-paper"
      >
        <AppIcon :name="trackIcon" :size="14" />
        {{ title }}
      </span>
      <span class="text-xs font-bold tabular-nums text-paper-muted">
        {{ num(enacted) }} / {{ num(total) }}
      </span>
    </header>
    <ol class="track-row">
      <li v-for="index in total" :key="index">
        <component
          :is="interactive(index - 1) ? 'button' : 'div'"
          :type="interactive(index - 1) ? 'button' : undefined"
          class="track-space policy-slot board-slot relative w-full"
          :class="interactive(index - 1) ? 'cursor-pointer hover:brightness-105' : ''"
          :aria-label="spaceLabel(index - 1)"
          :title="spaceLabel(index - 1)"
          @click="activate(index - 1)"
        >
          <PolicyCard
            v-if="index <= enacted"
            :policy="kind"
            face-up
            size="slot"
            seated
            :class="index % 2 === 0 ? 'tilt-r' : ''"
          />
          <span v-else class="m-auto flex flex-col items-center gap-0.5 text-ink-on-paper">
            <AppIcon
              v-if="spaceIcon(index - 1)"
              :name="spaceIcon(index - 1)!"
              :size="14"
              class="opacity-45"
            />
            <span class="text-xs font-bold tabular-nums">{{ num(index) }}</span>
          </span>
        </component>
      </li>
    </ol>
  </section>
</template>
