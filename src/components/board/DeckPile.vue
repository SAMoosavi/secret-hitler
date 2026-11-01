<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import { formatNumber } from '../../i18n/format'

const props = defineProps<{ kind: 'deck' | 'discard'; count: number }>()
const { t, locale } = useI18n()
const num = (value: number): string => formatNumber(value, locale.value)

const label = computed(() =>
  props.kind === 'deck'
    ? t('a11y.deckCount', { n: num(props.count) })
    : t('a11y.discardCount', { n: num(props.count) }),
)
const short = computed(() => (props.kind === 'deck' ? t('game.deck') : t('game.discard')))
</script>

<template>
  <div
    class="flex min-w-0 items-center gap-1"
    role="group"
    :aria-label="label"
    :title="label"
  >
    <div class="deck-stack" aria-hidden="true">
      <span
        v-for="n in 3"
        :key="n"
        class="deck-mini"
        :class="kind === 'deck' ? 'deck-mini-back' : 'deck-mini-discard'"
        :style="{ transform: `translate(${(n - 1) * 1.5}px, ${-(n - 1) * 1.5}px)` }"
      />
      <AppIcon name="cards" :size="13" class="absolute inset-0 m-auto text-brass" />
    </div>
    <div class="flex min-w-0 flex-col items-start leading-tight">
      <span class="brass-plaque min-h-0 px-1.5 py-0 text-xs">{{ num(count) }}</span>
      <span class="max-w-full truncate text-xs font-semibold text-paper-muted">{{ short }}</span>
    </div>
  </div>
</template>
