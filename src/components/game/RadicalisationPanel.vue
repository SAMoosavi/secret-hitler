<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import PlayerToken from '../base/PlayerToken.vue'
import { confirmAction } from '../../stores/confirm'
import { livingPlayers, secretStep } from '../../game/engine'
import type { GameState, Player } from '../../game/types'

const props = defineProps<{ state: GameState; busy?: boolean }>()
const emit = defineEmits<{
  radicalise: [id: number]
  nextReveal: []
  finish: []
}>()
const { t } = useI18n()

// Only transient UI state: the persisted step, index and result come from the save.
const ready = ref(false)
const revealed = ref(false)
const picker = ref<HTMLElement | null>(null)
const action = ref<HTMLButtonElement | null>(null)

const step = computed(() => secretStep(props.state))
const living = computed(() => livingPlayers(props.state))
const radicalisation = computed(() => props.state.radicalisation)
const revealIndex = computed(() => radicalisation.value?.revealIndex ?? 0)
const current = computed(() => living.value[revealIndex.value] ?? null)
const changed = computed(
  () =>
    !!radicalisation.value &&
    !!current.value &&
    radicalisation.value.targetId === current.value.id &&
    radicalisation.value.after !== radicalisation.value.before,
)
const title = computed(() => {
  if (step.value === 'radicaliseDone') return t('radicalise.resolvedTitle')
  if (step.value === 'radicaliseReveal') return t('radicalise.pickTitle')
  return ready.value ? t('radicalise.pickTitle') : t('radicalise.coverTitle')
})

async function focusAction(): Promise<void> {
  await nextTick()
  action.value?.focus()
}

async function focusFirstPlayer(): Promise<void> {
  await nextTick()
  picker.value?.querySelector<HTMLButtonElement>('button')?.focus()
}

watch([step, revealIndex], () => {
  revealed.value = false
  if (step.value !== 'radicalisePick') void focusAction()
})

onMounted(() => {
  if (step.value !== 'radicalisePick') void focusAction()
})

async function openPicker(): Promise<void> {
  ready.value = true
  await focusFirstPlayer()
}

async function reveal(): Promise<void> {
  revealed.value = true
  await focusAction()
}

async function choose(player: Player): Promise<void> {
  if (props.busy) return
  const ok = await confirmAction({
    title: t('radicalise.confirmTitle', { name: player.name }),
    message: t('radicalise.confirmBody'),
    confirmLabel: t('radicalise.confirm', { name: player.name }),
    required: true,
    danger: true,
  })
  if (ok) emit('radicalise', player.id)
}
</script>

<template>
  <AppDialog :open="true" :closeable="false" :title="title">
    <template v-if="step === 'radicalisePick'">
      <template v-if="!ready">
        <p class="text-sm text-muted" role="status">{{ t('radicalise.coverBody') }}</p>
        <button
          ref="action"
          type="button"
          class="btn btn-primary mt-4 w-full"
          :disabled="busy"
          @click="openPicker"
        >
          <AppIcon name="eye" :size="18" />
          {{ t('radicalise.presidentReady') }}
        </button>
      </template>
      <template v-else>
        <p class="text-sm text-muted">{{ t('radicalise.pickBody') }}</p>
        <ul ref="picker" class="mt-3 grid gap-1.5 sm:grid-cols-2">
          <li v-for="player in living" :key="player.id">
            <PlayerToken
              :player="player"
              :president="player.id === state.presidentId"
              allow-president
              selectable
              @select="choose(player)"
            />
          </li>
        </ul>
      </template>
    </template>

    <template v-else-if="step === 'radicaliseReveal' && current">
      <p class="text-lg font-bold" dir="auto">
        {{ t('radicalise.handoffTo', { name: current.name }) }}
      </p>
      <div v-if="!revealed" class="mt-4">
        <button
          ref="action"
          type="button"
          class="btn btn-primary w-full"
          :disabled="busy"
          @click="reveal"
        >
          <AppIcon name="eye" :size="18" />
          {{ t('common.reveal') }}
        </button>
      </div>
      <div v-else class="mt-4 rounded-xl border border-line bg-surface-2/50 p-4">
        <p
          class="flex items-center gap-2 text-xl font-extrabold"
          :class="changed ? 'text-communist' : 'text-ink'"
        >
          <AppIcon :name="changed ? 'star' : 'check'" :size="24" class="shrink-0" />
          <span>{{ changed ? t('radicalise.changed') : t('radicalise.noChange') }}</span>
        </p>
        <button
          ref="action"
          type="button"
          class="btn btn-primary mt-4 w-full"
          :disabled="busy"
          @click="emit('nextReveal')"
        >
          <AppIcon name="lock" :size="18" />
          {{ t('radicalise.hide') }}
        </button>
      </div>
    </template>

    <template v-else-if="step === 'radicaliseDone'">
      <div role="status">
        <p class="text-sm text-muted">{{ t('radicalise.resolvedBody') }}</p>
      </div>
      <button
        ref="action"
        type="button"
        class="btn btn-primary mt-4 w-full"
        :disabled="busy"
        @click="emit('finish')"
      >
        {{ t('common.continue') }}
      </button>
    </template>
  </AppDialog>
</template>
