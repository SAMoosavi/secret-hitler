<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import type { IconName } from '../base/icons'
import { confirmAction } from '../../stores/confirm'
import { useGameStore } from '../../stores/game'
import { formatNumber } from '../../i18n/format'
import {
  COMMUNIST_TRACK,
  fascistTrackFor,
  isExpansion,
  liberalTrackFor,
} from '../../game/constants'
import type { GameState, Party, Role } from '../../game/types'

const props = defineProps<{ state: GameState }>()
const { t, locale } = useI18n()
const num = (value: number): string => formatNumber(value, locale.value)
const router = useRouter()
const game = useGameStore()

const over = computed(() => props.state.gameOver)
// The engine already guarantees a legal winner set; joint is the only pair.
const kind = computed<'liberal' | 'fascist' | 'communist' | 'joint'>(() => {
  const winners = over.value?.winners ?? []
  if (winners.includes('liberal') && winners.includes('communist')) return 'joint'
  return winners[0] ?? 'liberal'
})
const SKINS: Record<typeof kind.value, { ring: string; icons: readonly IconName[] }> = {
  liberal: { ring: 'border-liberal bg-liberal/15 text-liberal', icons: ['sun'] },
  fascist: { ring: 'border-fascist bg-fascist/15 text-fascist', icons: ['crest'] },
  communist: { ring: 'border-communist bg-communist/15 text-communist', icons: ['star'] },
  joint: { ring: 'border-gold bg-gold/15 text-gold', icons: ['sun', 'star'] },
}
const TITLES: Record<typeof kind.value, string> = {
  liberal: 'gameOver.liberalWin',
  fascist: 'gameOver.fascistWin',
  communist: 'gameOver.communistWin',
  joint: 'gameOver.jointWin',
}
const skin = computed(() => SKINS[kind.value])
const title = computed(() => t(TITLES[kind.value]))
const expansion = computed(() => isExpansion(props.state.playerCount))
const totals = computed(() => [
  {
    key: 'game.liberalTrack',
    value: props.state.enactedLiberal,
    max: liberalTrackFor(props.state.playerCount),
  },
  {
    key: 'game.fascistTrack',
    value: props.state.enactedFascist,
    max: fascistTrackFor(props.state.playerCount),
  },
  { key: 'gameOver.totalCommunist', value: props.state.enactedCommunist, max: COMMUNIST_TRACK },
])
const ROLE_KEYS: Record<Role, string> = {
  liberal: 'reveal.liberal',
  fascist: 'reveal.fascist',
  hitler: 'reveal.hitler',
  communist: 'reveal.roleCommunist',
}
const PARTY_KEYS: Record<Party, string> = {
  liberal: 'confession.partyLiberal',
  fascist: 'confession.partyFascist',
  communist: 'confession.partyCommunist',
}
const reason = computed(() => {
  const key = over.value?.reason
  if (!key) return ''
  const count = key === 'liberalPolicies' ? props.state.enactedLiberal : props.state.enactedFascist
  return t(`gameOver.${key}`, { count: num(count) })
})

async function newGame(): Promise<void> {
  const ok = await confirmAction({
    title: t('gameOver.newGameTitle'),
    message: t('gameOver.newGameBody'),
    confirmLabel: t('gameOver.newGame'),
    required: true,
  })
  if (!ok) return
  await game.discardGame()
  router.push('/setup')
}
</script>

<template>
  <AppDialog :open="true" :closeable="false" :title="title">
    <div class="flex flex-col items-center gap-2 py-2 text-center">
      <span
        class="flex h-16 w-16 items-center justify-center gap-0.5 rounded-full border-2"
        :class="skin.ring"
      >
        <AppIcon
          v-for="icon in skin.icons"
          :key="icon"
          :name="icon"
          :size="skin.icons.length > 1 ? 26 : 36"
        />
      </span>
      <p class="mt-1 text-sm text-muted">{{ reason }}</p>

      <p v-if="!expansion" class="text-[0.7rem] text-muted">
        {{ t('gameOver.summary', {
          round: num(state.round),
          liberal: num(state.enactedLiberal),
          liberalMax: num(liberalTrackFor(state.playerCount)),
          fascist: num(state.enactedFascist),
          fascistMax: num(fascistTrackFor(state.playerCount)),
        }) }}
      </p>
      <template v-else>
        <p class="text-[0.7rem] text-muted">{{ t('game.round', { n: num(state.round) }) }}</p>
        <dl class="grid w-full grid-cols-3 gap-2">
          <div
            v-for="total in totals"
            :key="total.key"
            class="flex flex-col items-center rounded-lg border border-line bg-surface-2 px-1 py-1"
          >
            <dt class="text-[0.65rem] leading-tight text-muted">{{ t(total.key) }}</dt>
            <dd class="text-sm font-bold">{{ num(total.value) }}/{{ num(total.max) }}</dd>
          </div>
        </dl>
      </template>
    </div>

    <section v-if="expansion" class="mt-3">
      <h3 class="mb-1 text-sm font-bold">{{ t('gameOver.rolesTitle') }}</h3>
      <ul class="max-h-[38vh] space-y-1 overflow-y-auto pe-1">
        <li
          v-for="player in state.players"
          :key="player.id"
          class="flex min-h-12 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg border border-line px-2 py-1 text-sm"
        >
          <span class="w-full break-words font-semibold" dir="auto">{{ player.name }}</span>
          <span class="shrink-0">{{ t(ROLE_KEYS[player.role]) }}</span>
          <span class="shrink-0 text-muted">
            {{ t('reveal.partyLine', { party: t(PARTY_KEYS[player.party]) }) }}
          </span>
          <span
            v-if="player.party === 'communist' && player.role !== 'communist'"
            class="chip"
          >{{ t('gameOver.radicalised') }}</span>
        </li>
      </ul>
    </section>

    <div class="mt-3 grid gap-2">
      <button type="button" class="btn btn-primary" @click="newGame">
        <AppIcon name="play" :size="18" />
        {{ t('gameOver.newGame') }}
      </button>
      <button type="button" class="btn btn-secondary" @click="router.push('/')">
        {{ t('gameOver.menu') }}
      </button>
    </div>
  </AppDialog>
</template>
