<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import PolicyCard from '../base/PolicyCard.vue'
import { confirmAction } from '../../stores/confirm'
import { feedback } from '../../platform/feedback'
import { useSettingsStore } from '../../stores/settings'
import { formatNumber } from '../../i18n/format'
import type { GameState, Policy } from '../../game/types'

const props = defineProps<{ state: GameState; busy?: boolean }>()
const emit = defineEmits<{
  discard: [index: number]
  enact: [index: number]
  requestVeto: []
  veto: [accept: boolean]
}>()
const { t, locale } = useI18n()
const settings = useSettingsStore()
const num = (value: number): string => formatNumber(value, locale.value)

const revealed = ref(false)
const chancellorPhase = computed(() => props.state.phase === 'legislativeChancellor')
const hand = computed(() =>
  chancellorPhase.value
    ? (props.state.legislative?.chancellorHand ?? [])
    : (props.state.legislative?.presidentHand ?? []),
)
const president = computed(
  () => props.state.players.find((p) => p.id === props.state.presidentId)?.name ?? '',
)
const chancellor = computed(
  () => props.state.players.find((p) => p.id === props.state.lastChancellorId)?.name ?? '',
)
const holder = computed(() => (chancellorPhase.value ? chancellor.value : president.value))
const vetoRequested = computed(() => !!props.state.legislative?.vetoRequested)

watch(
  () => props.state.phase,
  () => {
    revealed.value = false
  },
)

function policyLabel(policy: Policy): string {
  return policy === 'liberal' ? t('legislative.policyLiberal') : t('legislative.policyFascist')
}

async function reveal(): Promise<void> {
  const ok = await confirmAction({
    title: t('legislative.revealTitle'),
    message: t('legislative.revealBody', {
      count: num(hand.value.length),
      name: holder.value,
    }),
    confirmLabel: t('legislative.revealConfirm', { name: holder.value }),
    required: true,
  })
  if (!ok) return
  revealed.value = true
  feedback('reveal', settings.settings)
}

async function choose(index: number): Promise<void> {
  const policy = hand.value[index]
  if (!policy) return
  const enact = chancellorPhase.value
  const ok = await confirmAction({
    title: t(enact ? 'legislative.enactTitle' : 'legislative.discardTitle', {
      policy: policyLabel(policy),
    }),
    message: t(enact ? 'legislative.enactBody' : 'legislative.discardBody'),
    confirmLabel: t(enact ? 'legislative.chooseEnact' : 'legislative.chooseDiscard'),
    required: true,
    danger: enact,
  })
  if (!ok) return
  if (enact) emit('enact', index)
  else emit('discard', index)
}

async function askVeto(): Promise<void> {
  const ok = await confirmAction({
    title: t('legislative.vetoTitle'),
    message: t('legislative.vetoBody'),
    confirmLabel: t('legislative.veto'),
    required: true,
  })
  if (ok) emit('requestVeto')
}

async function answerVeto(accept: boolean): Promise<void> {
  const ok = await confirmAction({
    title: accept ? t('legislative.vetoAccepted') : t('legislative.vetoRefused'),
    message: accept ? t('legislative.vetoBody') : t('legislative.vetoRefused'),
    confirmLabel: accept ? t('legislative.acceptVeto') : t('legislative.refuseVeto'),
    required: true,
    danger: accept,
  })
  if (ok) emit('veto', accept)
}
</script>

<template>
  <AppDialog :open="true" :closeable="false" :title="chancellorPhase ? t('legislative.chancellorTitle') : t('legislative.presidentTitle')">
    <p class="text-sm text-muted">
      {{ chancellorPhase ? t('legislative.chancellorHint', { name: chancellor }) : t('legislative.presidentHint', { name: president }) }}
    </p>

    <div v-if="!revealed" class="mt-4 flex flex-col items-center gap-3 rounded-xl border border-dashed border-line bg-surface-2/50 p-4">
      <div class="flex items-end justify-center gap-2">
        <PolicyCard v-for="n in hand.length" :key="n" size="md" />
      </div>
      <p class="text-sm font-bold">{{ t('legislative.cardsHidden') }}</p>
      <button type="button" class="btn btn-primary" :disabled="busy" @click="reveal">
        <AppIcon name="eye" :size="18" />
        {{ t('legislative.revealCards') }}
      </button>
    </div>

    <div v-else class="mt-4">
      <div class="flex flex-wrap items-end justify-center gap-3">
        <div v-for="(policy, index) in hand" :key="`${policy}-${index}`" class="flex flex-col items-center gap-1">
          <PolicyCard
            :policy="policy"
            face-up
            size="lg"
            clickable
            :disabled="busy"
            @select="choose(index)"
          />
          <span class="text-[0.65rem] font-bold text-muted">
            {{ chancellorPhase ? t('legislative.chooseEnact') : t('legislative.chooseDiscard') }}
          </span>
        </div>
      </div>

      <div v-if="chancellorPhase" class="mt-4 border-t border-line pt-3">
        <button
          v-if="state.vetoUnlocked && !vetoRequested"
          type="button"
          class="btn btn-secondary w-full"
          :disabled="busy"
          @click="askVeto"
        >
          <AppIcon name="scale" :size="18" />
          {{ t('legislative.veto') }}
        </button>
        <div v-else-if="vetoRequested" class="rounded-lg border border-gold/40 bg-gold/10 p-3">
          <p class="text-sm font-bold">{{ t('legislative.vetoRequested') }}</p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button type="button" class="btn btn-secondary" :disabled="busy" @click="answerVeto(false)">
              {{ t('legislative.refuseVeto') }}
            </button>
            <button type="button" class="btn btn-danger" :disabled="busy" @click="answerVeto(true)">
              {{ t('legislative.acceptVeto') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <p class="mt-4 text-xs text-muted">{{ t('reveal.privacy') }}</p>
  </AppDialog>
</template>
