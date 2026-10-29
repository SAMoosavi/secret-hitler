<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import PlayerToken from '../base/PlayerToken.vue'
import type { Eligibility, PublicPlayer } from '../../game/types'

const props = defineProps<{
  players: PublicPlayer[]
  presidentId: number
  chancellorId: number | null
  nomineeId: number | null
  eligibilities: Eligibility[]
  selectable?: boolean
  selectedId?: number | null
}>()
const emit = defineEmits<{ select: [id: number] }>()
const { t } = useI18n()

function eligibility(id: number): Eligibility {
  return props.eligibilities.find((e) => e.playerId === id) ?? {
    playerId: id,
    eligible: true,
    reason: 'ok',
  }
}
</script>

<template>
  <section class="player-strip" :aria-label="t('a11y.players')">
    <ul class="scroll-x no-scrollbar flex gap-1.5 pb-1">
      <li v-for="player in players" :key="player.id" class="shrink-0">
        <PlayerToken
          :player="player"
          :president="player.id === presidentId"
          :chancellor="player.id === chancellorId"
          :nominee="player.id === nomineeId"
          :eligible="eligibility(player.id).eligible"
          :reason="eligibility(player.id).reason"
          :selectable="selectable"
          :selected="selectedId === player.id"
          @select="emit('select', player.id)"
        />
      </li>
    </ul>
  </section>
</template>
