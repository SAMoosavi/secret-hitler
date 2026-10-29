<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import PolicyTrack from './PolicyTrack.vue'
import GovernmentPanel from './GovernmentPanel.vue'
import PlayerStrip from './PlayerStrip.vue'
import PowerModal from './PowerModal.vue'
import type { Eligibility, Power, PublicView } from '../../game/types'

const props = defineProps<{
  view: PublicView
  eligibilities: Eligibility[]
  selectable?: boolean
  selectedId?: number | null
}>()
const emit = defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

const info = ref<{ power: Exclude<Power, 'none'>; index: number } | null>(null)

function openInfo(power: Exclude<Power, 'none'>, index: number): void {
  info.value = { power, index }
}
</script>

<template>
  <div class="board-surface p-2" :aria-label="t('a11y.board')">
    <div class="board-tracks">
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
    </div>
    <GovernmentPanel :view="view" class="mt-2" />
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
