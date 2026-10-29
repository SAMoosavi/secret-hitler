<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import { FASCIST_TRACK, LIBERAL_TRACK, powerFor } from '../../game/constants'
import { formatNumber } from '../../i18n/format'
import type { Power } from '../../game/types'

const props = defineProps<{
  kind: 'liberal' | 'fascist'
  enacted: number
  playerCount: number
}>()
const emit = defineEmits<{ info: [power: Exclude<Power, 'none'>, index: number] }>()
const { t, locale } = useI18n()
const num = (value: number): string => formatNumber(value, locale.value)

const total = computed(() => (props.kind === 'liberal' ? LIBERAL_TRACK : FASCIST_TRACK))
const title = computed(() =>
  props.kind === 'liberal' ? t('game.liberalTrack') : t('game.fascistTrack'),
)
const policy = computed(() => (props.kind === 'liberal' ? 'liberal' : 'fascist'))

function powerAt(index: number): Power {
  if (props.kind === 'liberal') return 'none'
  return powerFor(props.playerCount, index + 1)
}

function powerName(power: Exclude<Power, 'none'>): string {
  return t(
    {
      investigate: 'executive.powerInvestigate',
      peek: 'executive.powerPeek',
      special: 'executive.powerSpecial',
      execute: 'executive.powerExecute',
    }[power],
  )
}

function spaceLabel(index: number): string {
  const power = powerAt(index)
  if (index + 1 === total.value && props.kind === 'fascist') {
    return `${title.value} ${index + 1}`
  }
  if (power !== 'none') return `${t('a11y.powerSpace', { name: powerName(power) })}`
  return index < props.enacted ? t('a11y.enacted') : t('a11y.empty')
}

function activate(index: number): void {
  const power = powerAt(index)
  if (power !== 'none' && index + 1 <= 5) emit('info', power, index)
}
</script>

<template>
  <section class="panel p-2" :aria-label="title">
    <header class="mb-1.5 flex items-center justify-between gap-2 px-1">
      <span class="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-wider">
        <AppIcon :name="kind === 'liberal' ? 'sun' : 'crest'" :size="15" />
        {{ title }}
      </span>
      <span class="text-[0.65rem] font-bold text-muted">
        {{ num(enacted) }} / {{ num(total) }}
      </span>
    </header>
    <ol class="flex gap-0.5">
      <li v-for="index in total" :key="index" class="flex-1">
        <component
          :is="powerAt(index - 1) !== 'none' && index <= 5 ? 'button' : 'div'"
          :type="powerAt(index - 1) !== 'none' && index <= 5 ? 'button' : undefined"
          class="track-space !h-14 w-full !rounded-md"
          :class="[
            index <= enacted ? 'enacted' : '',
            powerAt(index - 1) !== 'none' && index <= 5 ? 'interactive' : '',
            index <= enacted
              ? kind === 'liberal'
                ? '!border-liberal/70 bg-liberal/20 !text-liberal'
                : '!border-fascist/70 bg-fascist/20 !text-fascist'
              : '',
          ]"
          :aria-label="spaceLabel(index - 1)"
          :title="spaceLabel(index - 1)"
          @click="activate(index - 1)"
        >
          <span
            v-if="index <= enacted"
            class="flex flex-col items-center gap-0.5"
          >
            <AppIcon :name="kind === 'liberal' ? 'sun' : 'crest'" :size="18" />
            <AppIcon name="check" :size="11" class="text-gold" />
          </span>
          <span v-else class="flex flex-col items-center gap-0.5">
            <AppIcon
              v-if="powerAt(index - 1) !== 'none' && index <= 5"
              :name="
                powerAt(index - 1) === 'investigate'
                  ? 'eye'
                  : powerAt(index - 1) === 'peek'
                    ? 'cards'
                    : powerAt(index - 1) === 'special'
                      ? 'ballot'
                      : 'dagger'
              "
              :size="17"
            />
            <AppIcon v-else-if="kind === 'fascist' && index === total" name="crown" :size="16" />
            <span class="text-[0.62rem] font-bold">{{ num(index) }}</span>
          </span>
        </component>
      </li>
    </ol>
  </section>
</template>
