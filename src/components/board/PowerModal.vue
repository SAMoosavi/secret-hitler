<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import { formatNumber } from '../../i18n/format'
import type { Power } from '../../game/types'

type ActivePower = Exclude<Power, 'none'>

const props = defineProps<{
  open: boolean
  power: ActivePower
  index: number
  /** Policies already enacted on the track this space belongs to. */
  enacted: number
  /** Which board the space sits on: only the fascist board has executive actions. */
  track?: 'fascist' | 'communist'
  active: boolean
}>()
const emit = defineEmits<{ close: [] }>()
const { t, locale } = useI18n()

const title = computed(() =>
  props.track === 'communist' ? t('board.communistTrack') : t('game.powerInfo'),
)

const meta = computed(() => {
  switch (props.power) {
    case 'investigate':
      return {
        name: t('executive.powerInvestigate'),
        desc: t('executive.powerInvestigateDesc'),
        eligibility: t('executive.eligibilityInvestigate'),
        icon: 'eye' as const,
      }
    case 'peek':
      return {
        name: t('executive.powerPeek'),
        desc: t('executive.powerPeekDesc'),
        eligibility: t('executive.eligibilityPeek'),
        icon: 'cards' as const,
      }
    case 'special':
      return {
        name: t('executive.powerSpecial'),
        desc: t('executive.powerSpecialDesc'),
        eligibility: t('executive.eligibilitySpecial'),
        icon: 'ballot' as const,
      }
    case 'radicalise':
      return {
        name: t('setup.powerRadicalise'),
        desc: t('board.powerRadicaliseDesc'),
        icon: 'sparkles' as const,
      }
    case 'fiveYearPlan':
      return {
        name: t('setup.powerFiveYearPlan'),
        desc: t('board.powerFiveYearPlanDesc'),
        icon: 'cards' as const,
      }
    case 'confession':
      return {
        name: t('setup.powerConfession'),
        desc: t('board.powerConfessionDesc'),
        icon: 'eye' as const,
      }
    default:
      return {
        name: t('executive.powerExecute'),
        desc: t('executive.powerExecuteDesc'),
        eligibility: t('executive.eligibilityExecute'),
        icon: 'dagger' as const,
      }
  }
})

const availability = computed(() => {
  if (props.active) return t('game.powerNow')
  if (props.index + 1 <= props.enacted) return t('game.powerResolved')
  return t('game.powerAfter', { n: formatNumber(props.index + 1, locale.value) })
})
</script>

<template>
  <AppDialog :open="open" :title="title" @close="emit('close')">
    <div class="flex items-start gap-3">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
        <AppIcon :name="meta.icon" :size="26" />
      </span>
      <div class="min-w-0">
        <h3 class="text-lg font-bold">{{ meta.name }}</h3>
        <p class="mt-1 text-sm leading-relaxed text-muted">{{ meta.desc }}</p>
      </div>
    </div>
    <dl class="mt-4 grid gap-2 text-sm">
      <div class="rounded-lg border border-line bg-surface-2/60 p-2.5">
        <dt class="eyebrow">{{ title }}</dt>
        <dd class="mt-0.5">{{ availability }}</dd>
      </div>
      <div
        v-if="meta.eligibility"
        class="rounded-lg border border-line bg-surface-2/60 p-2.5"
      >
        <dt class="eyebrow">{{ t('game.eligible') }}</dt>
        <dd class="mt-0.5">{{ meta.eligibility }}</dd>
      </div>
    </dl>
    <template #actions>
      <button type="button" class="btn btn-primary" @click="emit('close')">
        {{ t('common.close') }}
      </button>
    </template>
  </AppDialog>
</template>
