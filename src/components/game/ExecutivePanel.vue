<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import PolicyCard from '../base/PolicyCard.vue'
import PlayerToken from '../base/PlayerToken.vue'
import { confirmAction } from '../../stores/confirm'
import { feedback } from '../../platform/feedback'
import { useSettingsStore } from '../../stores/settings'
import { formatNumber } from '../../i18n/format'
import type { GameState, Party, Player, Policy } from '../../game/types'

const props = defineProps<{ state: GameState; busy?: boolean }>()
const emit = defineEmits<{
  investigate: [id: number]
  acknowledgeInvestigation: []
  acknowledgePeek: []
  specialElection: [id: number]
  execute: [id: number]
  acknowledgeFiveYearPlan: []
}>()
const { t, locale } = useI18n()
const settings = useSettingsStore()
const num = (value: number): string => formatNumber(value, locale.value)

const peekRevealed = ref(false)
const power = computed(() => props.state.pendingAction?.type ?? null)
const president = computed(
  () => props.state.players.find((p) => p.id === props.state.presidentId)?.name ?? '',
)

const targets = computed<Player[]>(() => {
  const all = props.state.players.filter((p) => p.alive)
  if (power.value === 'investigate') {
    return all.filter((p) => !props.state.investigated.includes(p.id))
  }
  if (power.value === 'special') {
    return all.filter((p) => p.id !== props.state.presidentId)
  }
  return all
})

const title = computed(() => {
  switch (power.value) {
    case 'investigate':
      return t('executive.investigateTitle')
    case 'peek':
      return t('executive.peekTitle')
    case 'special':
      return t('executive.specialTitle')
    case 'execute':
      return t('executive.executeTitle')
    case 'fiveYearPlan':
      return t('fyp.title')
    default:
      return t('executive.investigateTitle')
  }
})

// A converted player must read Communist, not their original party.
function partyView(party: Party): { icon: 'sun' | 'crest' | 'star'; tone: string; label: string } {
  if (party === 'liberal') {
    return { icon: 'sun', tone: 'text-liberal', label: t('executive.partyLiberal') }
  }
  if (party === 'communist') {
    return { icon: 'star', tone: 'text-communist', label: t('executive.partyCommunist') }
  }
  return { icon: 'crest', tone: 'text-fascist', label: t('executive.partyFascist') }
}

function policyLabel(policy: Policy): string {
  if (policy === 'liberal') return t('legislative.policyLiberal')
  if (policy === 'communist') return t('legislative.policyCommunist')
  return t('legislative.policyFascist')
}

async function choose(player: Player): Promise<void> {
  if (power.value === 'investigate') {
    const ok = await confirmAction({
      title: t('executive.investigateConfirm', { name: player.name }),
      message: t('executive.investigateConfirmBody'),
      confirmLabel: t('executive.investigateChoose', { name: player.name }),
      required: true,
    })
    if (ok) emit('investigate', player.id)
  } else if (power.value === 'special') {
    const ok = await confirmAction({
      title: t('executive.specialConfirm', { name: player.name }),
      message: t('executive.specialConfirmBody'),
      confirmLabel: t('executive.specialChoose', { name: player.name }),
      required: true,
    })
    if (ok) emit('specialElection', player.id)
  } else if (power.value === 'execute') {
    const ok = await confirmAction({
      title: t('executive.executeConfirm', { name: player.name }),
      message: t('executive.executeConfirmBody'),
      confirmLabel: t('executive.executeChoose', { name: player.name }),
      required: true,
      danger: true,
    })
    if (ok) emit('execute', player.id)
  }
}

async function revealPeek(): Promise<void> {
  const ok = await confirmAction({
    title: t('executive.peekConfirmTitle'),
    message: t('executive.peekHint'),
    confirmLabel: t('executive.peekConfirm'),
    required: true,
  })
  if (!ok) return
  peekRevealed.value = true
  feedback('reveal', settings.settings)
}

async function acknowledgePeek(): Promise<void> {
  const ok = await confirmAction({
    title: t('executive.peekDoneTitle'),
    message: t('executive.peekBody'),
    confirmLabel: t('executive.peekDone'),
  })
  if (ok) emit('acknowledgePeek')
}

async function acknowledgeInvestigation(): Promise<void> {
  const ok = await confirmAction({
    title: t('executive.resultCloseTitle'),
    message: t('executive.investigationPrivate'),
    confirmLabel: t('executive.closeResult'),
  })
  if (ok) emit('acknowledgeInvestigation')
}
</script>

<template>
  <AppDialog :open="true" :closeable="false" :title="title">
    <p v-if="power !== 'fiveYearPlan'" class="text-sm text-muted">
      {{ t('reveal.passTo', { name: president }) }}
    </p>

    <template v-if="power === 'fiveYearPlan'">
      <p class="mt-2 text-sm text-muted" role="status">{{ t('fyp.body') }}</p>
      <p class="mt-2 text-sm font-bold">{{ t('fyp.deck', { count: num(state.deck.length) }) }}</p>
      <button
        type="button"
        class="btn btn-primary mt-4 w-full"
        :disabled="busy"
        @click="emit('acknowledgeFiveYearPlan')"
      >
        {{ t('common.continue') }}
      </button>
    </template>

    <template v-else-if="power === 'peek'">
      <div v-if="!peekRevealed" class="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface-2/50 p-4">
        <div class="flex gap-2">
          <PolicyCard v-for="n in 3" :key="n" size="md" />
        </div>
        <p class="text-sm font-bold">{{ t('executive.peekHint') }}</p>
        <button type="button" class="btn btn-primary" :disabled="busy" @click="revealPeek">
          <AppIcon name="eye" :size="18" />
          {{ t('common.reveal') }}
        </button>
      </div>
      <div v-else class="mt-4">
        <div class="flex flex-wrap items-end justify-center gap-2">
          <div v-for="(policy, index) in state.peeked ?? []" :key="index" class="flex flex-col items-center gap-1">
            <PolicyCard :policy="policy" face-up size="lg" />
            <span class="text-[0.65rem] font-bold text-muted">{{ index + 1 }}</span>
          </div>
        </div>
        <p class="mt-2 text-center text-xs text-muted">{{ t('executive.peekBody') }}</p>
        <button type="button" class="btn btn-primary mt-3 w-full" :disabled="busy" @click="acknowledgePeek">
          {{ t('executive.peekAck') }}
        </button>
      </div>
    </template>

    <template v-else-if="power === 'investigate' && state.investigation">
      <div class="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-4 text-center">
        <p class="eyebrow">{{ t('executive.resultTitle') }}</p>
        <p class="mt-1 text-lg font-bold">
          {{ state.players.find((p) => p.id === state.investigation!.playerId)?.name }}
        </p>
        <p
          class="mt-2 flex items-center justify-center gap-2 text-sm font-bold"
          :class="partyView(state.investigation.party).tone"
        >
          <AppIcon :name="partyView(state.investigation.party).icon" :size="20" />
          {{ partyView(state.investigation.party).label }}
        </p>
        <p class="mt-2 text-xs text-muted">{{ t('executive.investigateConfirmBody') }}</p>
      </div>
      <button type="button" class="btn btn-primary mt-3 w-full" :disabled="busy" @click="acknowledgeInvestigation">
        {{ t('executive.closeResult') }}
      </button>
    </template>

    <template v-else>
      <p class="mt-1 text-xs text-muted">
        {{ power === 'investigate' ? t('executive.investigateHint') : power === 'special' ? t('executive.specialHint') : t('executive.executeHint') }}
      </p>
      <ul class="mt-3 grid gap-1.5 sm:grid-cols-2">
        <li v-for="player in targets" :key="player.id">
          <PlayerToken
            :player="player"
            :president="player.id === state.presidentId"
            :chancellor="player.id === state.lastChancellorId"
            :nominee="player.id === state.nomineeId"
            eligible
            selectable
            @select="choose(player)"
          />
        </li>
      </ul>
      <p v-if="targets.length === 0" class="mt-3 text-sm text-muted">{{ t('nomination.none') }}</p>
    </template>
  </AppDialog>
</template>
