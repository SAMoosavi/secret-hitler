<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
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

/** Only the Fascist board opens the power card; the Communist track is read-only. */
function interactive(index: number): boolean {
  return props.kind === 'fascist' && powerAt(index) !== 'none'
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

/**
 * The powers do not fit in a 1/6 column, so list them once as text:
 * "2, 4 Radicalisation · 3 Five-Year Plan · 5 Confession · 6 Victory".
 */
const legend = computed(() => {
  const groups = new Map<string, number[]>()
  for (let index = 1; index < total.value; index += 1) {
    const label = index + 1 === total.value ? t('setup.powerVictory') : powerName(powerAt(index))
    if (!label) continue
    groups.set(label, [...(groups.get(label) ?? []), index + 1])
  }
  return [...groups].map(([label, spaces]) => `${spaces.map(num).join(', ')} ${label}`).join(' · ')
})

function activate(index: number): void {
  if (!interactive(index)) return
  emit('info', powerAt(index) as Exclude<Power, 'none'>, index)
}
</script>

<template>
  <section class="panel p-2" :aria-label="title">
    <header class="mb-1.5 flex items-center justify-between gap-2 px-1">
      <span class="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-wider">
        <AppIcon :name="trackIcon" :size="15" />
        {{ title }}
      </span>
      <span class="text-[0.65rem] font-bold text-muted">
        {{ num(enacted) }} / {{ num(total) }}
      </span>
    </header>
    <ol class="flex gap-0.5">
      <li v-for="index in total" :key="index" class="flex-1">
        <component
          :is="interactive(index - 1) ? 'button' : 'div'"
          :type="interactive(index - 1) ? 'button' : undefined"
          class="track-space !h-14 w-full !rounded-md"
          :class="[
            index <= enacted ? 'enacted' : '',
            interactive(index - 1) ? 'interactive' : '',
            index <= enacted
              ? kind === 'liberal'
                ? '!border-liberal/70 bg-liberal/20 !text-liberal'
                : kind === 'fascist'
                  ? '!border-fascist/70 bg-fascist/20 !text-fascist'
                  : '!border-communist/70 bg-communist/20 !text-communist'
              : '',
          ]"
          :aria-label="spaceLabel(index - 1)"
          :title="spaceLabel(index - 1)"
          @click="activate(index - 1)"
        >
          <span v-if="index <= enacted" class="flex flex-col items-center gap-0.5">
            <AppIcon :name="trackIcon" :size="kind === 'communist' ? 16 : 18" />
            <AppIcon name="check" :size="11" class="text-gold" />
          </span>
          <span v-else class="flex flex-col items-center gap-0.5">
            <AppIcon
              v-if="spaceIcon(index - 1)"
              :name="spaceIcon(index - 1)!"
              :size="kind === 'communist' ? 14 : index === total ? 16 : 17"
            />
            <span class="text-[0.62rem] font-bold">{{ num(index) }}</span>
          </span>
        </component>
      </li>
    </ol>
    <p v-if="kind === 'communist'" class="mt-1 px-1 text-[0.58rem] leading-tight text-muted">
      {{ legend }}
    </p>
  </section>
</template>
