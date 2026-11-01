<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import type { EligibilityReason } from '../../game/types'

const props = withDefaults(
  defineProps<{
    player: { id: number; name: string; alive: boolean }
    president?: boolean
    chancellor?: boolean
    nominee?: boolean
    eligible?: boolean
    reason?: EligibilityReason
    selectable?: boolean
    selected?: boolean
    /** Radicalisation may target the sitting President. */
    allowPresident?: boolean
  }>(),
  {
    president: false,
    chancellor: false,
    nominee: false,
    eligible: true,
    reason: 'ok',
    selectable: false,
    selected: false,
    allowPresident: false,
  },
)
const emit = defineEmits<{ select: [] }>()
const { t, locale } = useI18n()

const canSelect = computed(
  () =>
    props.selectable &&
    props.player.alive &&
    props.eligible &&
    (props.allowPresident || !props.president),
)
/**
 * The plate carries only the name: colour says whether the seat can be picked
 * (cream), cannot (faded into the board) or is the current pick (brass).
 */
const blocked = computed(
  () =>
    props.selectable &&
    (!props.player.alive || (!props.eligible && props.reason !== 'president')),
)
const stateClass = computed(() => [
  props.selected ? 'is-selected' : '',
  blocked.value ? 'is-blocked' : '',
  canSelect.value ? 'is-pickable' : '',
])
/** Seals are icons now; the full sentence lives in the tooltip and the spoken label. */
const reasonText = computed(() => {
  if (!props.player.alive) return t('nomination.reasonDead')
  // The crown already says "president"; a lock here would read as ineligible.
  if (props.reason === 'president') return ''
  if (props.reason === 'termPresident') return t('nomination.reasonTermPresident')
  if (props.reason === 'termChancellor') return t('nomination.reasonTermChancellor')
  return ''
})
const statusLabel = computed(() => {
  const parts: string[] = []
  if (!props.player.alive) parts.push(t('game.eliminated'))
  if (props.president) parts.push(t('game.president'))
  if (props.chancellor) parts.push(t('game.chancellor'))
  if (props.nominee) parts.push(t('game.nomineeShort'))
  if (props.player.alive && !props.eligible && props.reason !== 'president') {
    parts.push(t('game.termLimited'))
  }
  if (!parts.length) return props.player.name
  return `${props.player.name} — ${parts.join(locale.value === 'fa' ? '، ' : ', ')}`
})

function select(): void {
  if (canSelect.value) emit('select')
}
</script>

<template>
  <component
    :is="selectable ? 'button' : 'div'"
    :type="selectable ? 'button' : undefined"
    class="nameplate w-full min-w-0 !gap-1 !px-1.5 transition"
    :class="[
      stateClass,
      canSelect ? 'cursor-pointer hover:brightness-105' : '',
      selectable && !canSelect ? 'cursor-not-allowed' : '',
    ]"
    :aria-pressed="selectable ? selected : undefined"
    :aria-disabled="selectable && !canSelect ? 'true' : undefined"
    :aria-label="selectable ? statusLabel : undefined"
    :title="reasonText || player.name"
    @click="select"
  >
    <AppIcon
      v-if="president"
      name="crown"
      :size="13"
      class="shrink-0"
      :class="selected ? '' : 'text-brass'"
      aria-hidden="true"
    />
    <AppIcon
      v-else-if="chancellor"
      name="shield"
      :size="12"
      class="shrink-0"
      aria-hidden="true"
    />
    <AppIcon v-else-if="nominee" name="ballot" :size="12" class="shrink-0" aria-hidden="true" />
    <span
      class="min-w-0 truncate text-base font-bold leading-tight"
      :class="!player.alive ? 'line-through' : ''"
    >
      {{ player.name }}
    </span>
    <AppIcon
      v-if="blocked"
      :name="player.alive ? 'lock' : 'x'"
      :size="12"
      class="ms-auto shrink-0"
      aria-hidden="true"
    />
  </component>
</template>
