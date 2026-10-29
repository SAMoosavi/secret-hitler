<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import ElectionTracker from './ElectionTracker.vue'
import { formatNumber } from '../../i18n/format'
import type { PublicView } from '../../game/types'

const props = defineProps<{ view: PublicView }>()
const { t, locale } = useI18n()

function nameOf(id: number | null): string {
  if (id === null) return '—'
  return props.view.players.find((p) => p.id === id)?.name ?? '—'
}
function num(value: number): string {
  return formatNumber(value, locale.value)
}

const electionText = computed(() => {
  const result = props.view.lastElection
  if (!result) return t('game.noElection')
  const outcome = result.approved ? t('game.approved') : t('game.rejected')
  return `${outcome}: ${nameOf(result.presidentId)} / ${nameOf(result.chancellorId)}`
})
</script>

<template>
  <section class="panel gov-panel grid grid-cols-2 gap-x-3 gap-y-2 p-2.5" :aria-label="t('game.title')">
    <div class="min-w-0">
      <p class="eyebrow flex items-center gap-1">
        <AppIcon name="crown" :size="12" />
        {{ t('game.president') }}
      </p>
      <p class="truncate text-sm font-bold">{{ nameOf(view.presidentId) }}</p>
    </div>
    <div class="min-w-0">
      <p class="eyebrow flex items-center gap-1">
        <AppIcon name="shield" :size="12" />
        {{ t('game.chancellor') }}
      </p>
      <p class="truncate text-sm font-bold">{{ nameOf(view.lastChancellorId) }}</p>
    </div>
    <div class="min-w-0">
      <p class="eyebrow flex items-center gap-1">
        <AppIcon name="ballot" :size="12" />
        {{ t('game.nominee') }}
      </p>
      <p class="truncate text-sm font-bold">
        {{ view.nomineeId === null ? t('game.noNominee') : nameOf(view.nomineeId) }}
      </p>
    </div>
    <div class="gov-last-election min-w-0">
      <p class="eyebrow">{{ t('game.lastElection') }}</p>
      <p class="truncate text-[0.72rem] font-semibold text-muted">{{ electionText }}</p>
    </div>
    <div class="gov-tracker col-span-2 flex items-center justify-between gap-2 border-t border-line pt-2">
      <ElectionTracker :value="view.tracker" :veto-unlocked="view.vetoUnlocked" />
      <div class="flex items-center gap-2 text-[0.68rem] font-bold text-muted">
        <span class="chip !py-0.5" :title="t('a11y.deckCount', { n: num(view.deckCount) })">
          <AppIcon name="cards" :size="12" />
          {{ num(view.deckCount) }}
        </span>
        <span class="chip !py-0.5" :title="t('a11y.discardCount', { n: num(view.discardCount) })">
          <AppIcon name="trash" :size="12" />
          {{ num(view.discardCount) }}
        </span>
      </div>
    </div>
    <div class="gov-chips col-span-2 flex flex-wrap items-center gap-2 text-[0.68rem] text-muted">
      <span class="chip !py-0.5">{{ t('game.round', { n: num(view.round) }) }}</span>
      <span class="chip !py-0.5">{{ t(`phases.${view.phase}`) }}</span>
      <span class="chip !py-0.5">
        <AppIcon name="sun" :size="11" class="text-liberal" />
        {{ num(view.enactedLiberal) }}/{{ num(5) }}
      </span>
      <span class="chip !py-0.5">
        <AppIcon name="crest" :size="11" class="text-fascist" />
        {{ num(view.enactedFascist) }}/{{ num(6) }}
      </span>
    </div>
  </section>
</template>
