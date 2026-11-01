<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import { formatNumber } from '../../i18n/format'

defineProps<{ value: number; vetoUnlocked?: boolean }>()
const { t, locale } = useI18n()
const num = (value: number): string => formatNumber(value, locale.value)
</script>

<template>
  <div class="flex min-w-0 items-center gap-1.5">
    <span class="hidden text-xs font-bold uppercase tracking-wider text-paper-muted sm:inline">
      {{ t('game.tracker') }}
    </span>
    <div
      class="tracker-rail"
      role="img"
      :aria-label="`${t('game.tracker')}: ${num(value)}/3`"
      :style="{ '--pos': value }"
    >
      <span v-for="n in 3" :key="n" class="tracker-hole">
        <AppIcon v-if="n <= value" name="x" :size="9" class="text-oxblood" />
      </span>
      <span class="tracker-pawn" aria-hidden="true" />
    </div>
    <span v-if="vetoUnlocked" class="brass-plaque min-h-0 px-1.5 py-0 text-xs">
      {{ t('game.vetoUnlocked') }}
    </span>
  </div>
</template>
