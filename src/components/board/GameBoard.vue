<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import PolicyTrack from './PolicyTrack.vue'
import GovernmentPanel from './GovernmentPanel.vue'
import PlayerStrip from './PlayerStrip.vue'
import PowerModal from './PowerModal.vue'
import { formatNumber } from '../../i18n/format'
import type { Eligibility, Power, PublicView } from '../../game/types'

const props = defineProps<{
  view: PublicView
  eligibilities: Eligibility[]
  selectable?: boolean
  selectedId?: number | null
}>()
const emit = defineEmits<{ select: [id: number] }>()
const { t, locale } = useI18n()

const info = ref<{ power: Exclude<Power, 'none'>; index: number } | null>(null)
const showAllConfessions = ref(false)

const expansion = computed(() => props.view.expansion === 'communist')
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

function openInfo(power: Exclude<Power, 'none'>, index: number): void {
  info.value = { power, index }
}
</script>

<template>
  <div class="board-surface p-2" :aria-label="t('a11y.board')">
    <div class="board-tracks" :class="{ 'board-tracks-expansion': expansion }">
      <PolicyTrack
        kind="liberal"
        :enacted="view.enactedLiberal"
        :player-count="view.playerCount"
        @info="openInfo"
      />
      <PolicyTrack
        kind="fascist"
        :enacted="view.enactedFascist"
        :player-count="view.playerCount"
        @info="openInfo"
      />
      <PolicyTrack
        v-if="expansion"
        kind="communist"
        :enacted="view.enactedCommunist ?? 0"
        :player-count="view.playerCount"
        @info="openInfo"
      />
    </div>
    <GovernmentPanel :view="view" class="mt-2" />
    <section
      v-if="expansion && confessionRows.length"
      class="panel mt-2 p-2"
      :aria-label="t('a11y.confessionHistory')"
    >
      <header class="mb-1 flex items-center justify-between gap-2 px-1">
        <span class="flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-wider">
          <AppIcon name="book" :size="14" />
          {{ t('board.confessions') }}
        </span>
        <button
          v-if="confessionRows.length > 2"
          type="button"
          class="btn btn-secondary !px-3 !py-1 text-xs"
          @click="showAllConfessions = !showAllConfessions"
        >
          {{ showAllConfessions ? t('board.hideConfessions') : t('board.showAllConfessions') }}
        </button>
      </header>
      <ul class="flex flex-col gap-0.5 px-1 text-[0.68rem] font-semibold text-muted">
        <li v-for="(row, index) in shownConfessions" :key="index">
          {{ t('confession.historyRow', row) }}
        </li>
      </ul>
    </section>
    <PlayerStrip
      :players="view.players"
      :president-id="view.presidentId"
      :chancellor-id="view.lastChancellorId"
      :nominee-id="view.nomineeId"
      :eligibilities="eligibilities"
      :selectable="selectable"
      :selected-id="selectedId"
      class="mt-2"
      @select="emit('select', $event)"
    />
    <PowerModal
      v-if="info"
      :open="!!info"
      :power="info.power"
      :index="info.index"
      :enacted-fascist="view.enactedFascist"
      :active="view.phase === 'executive' && view.pendingActionType === info.power"
      @close="info = null"
    />
  </div>
</template>
