<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import PolicyTrack from './PolicyTrack.vue'
import GovernmentPanel from './GovernmentPanel.vue'
import PlayerStrip from './PlayerStrip.vue'
import DeckPile from './DeckPile.vue'
import ElectionTracker from './ElectionTracker.vue'
import PowerModal from './PowerModal.vue'
import { formatNumber } from '../../i18n/format'
import {
  COMMUNIST_TRACK,
  HAND_SIZE,
  TRACKER_MAX,
  deckRecipeFor,
  fascistTrackFor,
  liberalTrackFor,
} from '../../game/constants'
import type { Eligibility, Power, PublicView } from '../../game/types'

const props = defineProps<{
  view: PublicView
  eligibilities: Eligibility[]
  selectable?: boolean
  selectedId?: number | null
}>()
const emit = defineEmits<{ select: [id: number] }>()
const { t, locale } = useI18n()

const info = ref<{
  power: Exclude<Power, 'none'>
  index: number
  enacted: number
  communist: boolean
} | null>(null)
const num = (value: number): string => formatNumber(value, locale.value)
const showAllConfessions = ref(false)
const showBoardInfo = ref(false)

const expansion = computed(() => props.view.expansion === 'communist')

/** Everything a player would read off the printed board before the first draw. */
const boardFacts = computed(() => {
  const count = props.view.playerCount
  const deck = deckRecipeFor(count)
  const rows = [
    { key: 'board.infoTrackLiberal', value: num(liberalTrackFor(count)) },
    { key: 'board.infoTrackFascist', value: num(fascistTrackFor(count)) },
    { key: 'board.infoDeckLiberal', value: num(deck.liberal) },
    { key: 'board.infoDeckFascist', value: num(deck.fascist) },
  ]
  if (expansion.value) {
    rows.splice(2, 0, { key: 'board.infoTrackCommunist', value: num(COMMUNIST_TRACK) })
    rows.push({ key: 'board.infoDeckCommunist', value: num(deck.communist) })
  }
  rows.push(
    { key: 'board.infoHand', value: num(HAND_SIZE) },
    { key: 'board.infoTracker', value: num(TRACKER_MAX) },
  )
  return rows
})
const PARTY_KEYS = {
  liberal: 'confession.partyLiberal',
  fascist: 'confession.partyFascist',
  communist: 'confession.partyCommunist',
} as const

const confessionRows = computed(() =>
  (props.view.confessions ?? []).map((confession) => ({
    round: formatNumber(confession.round, locale.value),
    name: props.view.players.find((player) => player.id === confession.playerId)?.name ?? '—',
    party: t(PARTY_KEYS[confession.party]),
  })),
)
// Newest last, collapsed to the two most recent public records.
const shownConfessions = computed(() =>
  showAllConfessions.value ? confessionRows.value : confessionRows.value.slice(-2),
)

function openInfo(
  power: Exclude<Power, 'none'>,
  index: number,
  enacted: number,
  communist = false,
): void {
  info.value = { power, index, enacted, communist }
}
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <div class="board p-1.5" :aria-label="t('a11y.board')">
      <header
        class="mb-1 flex items-center justify-between gap-2 border-b border-board-edge/40 px-0.5 pb-0.5"
      >
        <span
          class="flex min-w-0 items-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-paper-muted"
        >
          <AppIcon name="crest" :size="13" />
          <span class="truncate">Secret Hitler</span>
        </span>
      </header>

      <GovernmentPanel :view="view" />

      <div class="board-tracks mt-1 flex flex-col gap-0.5">
        <PolicyTrack
          kind="liberal"
          :enacted="view.enactedLiberal"
          :player-count="view.playerCount"
        />
        <PolicyTrack
          kind="fascist"
          :enacted="view.enactedFascist"
          :player-count="view.playerCount"
          @info="(power, index) => openInfo(power, index, view.enactedFascist)"
        />
        <PolicyTrack
          v-if="expansion"
          kind="communist"
          :enacted="view.enactedCommunist ?? 0"
          :player-count="view.playerCount"
          @info="(power, index) => openInfo(power, index, view.enactedCommunist ?? 0, true)"
        />
      </div>

      <div
        class="mt-1 flex items-center justify-between gap-1 border-t border-board-edge/40 px-0.5 pt-1"
      >
        <DeckPile kind="deck" :count="view.deckCount" />
        <ElectionTracker :value="view.tracker" :veto-unlocked="view.vetoUnlocked" />
        <DeckPile kind="discard" :count="view.discardCount" />
        <button
          type="button"
          class="board-btn"
          :aria-label="t('board.info')"
          @click="showBoardInfo = true"
        >
          <AppIcon name="help" :size="18" />
        </button>
      </div>

      <section
        v-if="expansion && confessionRows.length"
        class="paper mt-1.5 p-1.5"
        :aria-label="t('a11y.confessionHistory')"
      >
        <header class="mb-1 flex items-center justify-between gap-2">
          <span
            class="flex items-center gap-1 text-xs font-extrabold uppercase tracking-wider text-ink-on-paper"
          >
            <AppIcon name="book" :size="12" />
            {{ t('board.confessions') }}
          </span>
          <button
            v-if="confessionRows.length > 2"
            type="button"
            class="btn btn-secondary btn-sm"
            @click="showAllConfessions = !showAllConfessions"
          >
            {{ showAllConfessions ? t('board.hideConfessions') : t('board.showAllConfessions') }}
          </button>
        </header>
        <ul class="flex flex-col gap-0.5 text-xs font-semibold text-paper-muted">
          <li v-for="(row, index) in shownConfessions" :key="index">
            {{ t('confession.historyRow', row) }}
          </li>
        </ul>
      </section>
    </div>

    <PlayerStrip
      :players="view.players"
      :president-id="view.presidentId"
      :chancellor-id="view.lastChancellorId"
      :nominee-id="view.nomineeId"
      :eligibilities="eligibilities"
      :selectable="selectable"
      :selected-id="selectedId"
      @select="emit('select', $event)"
    />

    <AppDialog
      :open="showBoardInfo"
      :title="t('board.infoTitle', { count: num(view.playerCount) })"
      @close="showBoardInfo = false"
    >
      <dl class="grid gap-1.5 text-sm">
        <div
          v-for="row in boardFacts"
          :key="row.key"
          class="flex items-baseline justify-between gap-3 rounded-lg border border-line bg-surface-2/60 px-3 py-2"
        >
          <dt class="min-w-0">{{ t(row.key) }}</dt>
          <dd class="font-bold tabular-nums">{{ row.value }}</dd>
        </div>
      </dl>
      <template #actions>
        <button type="button" class="btn btn-primary" @click="showBoardInfo = false">
          {{ t('common.close') }}
        </button>
      </template>
    </AppDialog>

    <PowerModal
      v-if="info"
      :open="!!info"
      :power="info.power"
      :index="info.index"
      :enacted="info.enacted"
      :track="info.communist ? 'communist' : 'fascist'"
      :active="view.phase === 'executive' && view.pendingActionType === info.power"
      @close="info = null"
    />
  </div>
</template>
