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
  }>(),
  {
    president: false,
    chancellor: false,
    nominee: false,
    eligible: true,
    reason: 'ok',
    selectable: false,
    selected: false,
  },
)
const emit = defineEmits<{ select: [] }>()
const { t, locale } = useI18n()

const canSelect = computed(
  () => props.selectable && props.player.alive && props.eligible && !props.president,
)
const reasonText = computed(() => {
  if (!props.player.alive) return t('nomination.reasonDead')
  if (props.reason === 'president') return t('nomination.reasonPresident')
  if (props.reason === 'termPresident') return t('nomination.reasonTermPresident')
  if (props.reason === 'termChancellor') return t('nomination.reasonTermChancellor')
  return ''
})
// The visual chips are tiny; screen readers get one spoken status instead.
const statusLabel = computed(() => {
  const parts: string[] = []
  if (!props.player.alive) parts.push(t('game.eliminated'))
  if (props.president) parts.push(t('game.president'))
  if (props.chancellor) parts.push(t('game.chancellor'))
  if (props.nominee) parts.push(t('game.nominee'))
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
    class="flex min-h-12 w-full min-w-[7.5rem] items-center gap-2 rounded-lg border px-2.5 py-1.5 text-start transition"
    :class="[
      selected
        ? 'border-gold bg-surface-3 ring-2 ring-gold/40'
        : 'border-line bg-surface-2/70',
      canSelect ? 'cursor-pointer hover:border-gold/60' : '',
      !player.alive ? 'opacity-55' : '',
      selectable && !canSelect ? 'cursor-not-allowed opacity-60' : '',
    ]"
    :aria-pressed="selectable ? selected : undefined"
    :aria-disabled="selectable && !canSelect ? 'true' : undefined"
    :aria-label="selectable ? statusLabel : undefined"
    :title="reasonText || player.name"
    @click="select"
  >
    <span
      class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-xs font-extrabold"
      aria-hidden="true"
    >
      {{ player.name.slice(0, 2) }}
    </span>
    <span class="min-w-0 flex-1">
      <span class="flex items-center gap-1">
        <span class="truncate text-sm font-bold" :class="!player.alive ? 'line-through' : ''">
          {{ player.name }}
        </span>
        <AppIcon v-if="president" name="crown" :size="14" class="shrink-0 text-gold" />
        <AppIcon v-if="chancellor" name="shield" :size="14" class="shrink-0 text-emerald-500" />
        <AppIcon v-if="nominee" name="ballot" :size="14" class="shrink-0 text-sky-400" />
      </span>
      <span class="mt-0.5 flex flex-wrap items-center gap-1 text-[0.62rem] leading-tight text-muted">
        <span v-if="!player.alive" class="chip !py-0 !text-[0.6rem]">{{ t('game.eliminated') }}</span>
        <span v-else-if="!eligible && reason !== 'president'" class="chip !py-0 !text-[0.6rem]">
          <AppIcon name="lock" :size="10" />
          {{ t('game.termLimited') }}
        </span>
        <span v-else-if="reason === 'president'" class="chip !py-0 !text-[0.6rem]">
          <AppIcon name="crown" :size="10" />
          {{ t('game.president') }}
        </span>
        <span v-else class="chip !py-0 !text-[0.6rem]">
          <AppIcon name="check" :size="10" />
          {{ t('game.eligible') }}
        </span>
      </span>
    </span>
  </component>
</template>
