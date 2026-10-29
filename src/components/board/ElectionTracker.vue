<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import { formatNumber } from '../../i18n/format'

defineProps<{ value: number; vetoUnlocked?: boolean }>()
const { t, locale } = useI18n()
const num = (value: number): string => formatNumber(value, locale.value)
</script>

<template>
  <div>
    <div class="mb-1 flex items-center justify-between gap-2">
      <span class="text-[0.68rem] font-bold uppercase tracking-wider text-muted">
        {{ t('game.tracker') }}
      </span>
      <span
        v-if="vetoUnlocked"
        class="chip !border-gold/50 !text-gold !py-0 !text-[0.6rem]"
      >
        <AppIcon name="scale" :size="11" />
        {{ t('game.vetoUnlocked') }}
      </span>
    </div>
    <div class="flex items-center gap-1.5" role="img" :aria-label="`${t('game.tracker')}: ${num(value)}/3`">
      <span
        v-for="n in 3"
        :key="n"
        class="flex h-7 w-8 items-center justify-center rounded-md border text-[0.65rem] font-extrabold"
        :class="
          n <= value
            ? 'border-gold bg-gold/20 text-gold'
            : 'border-line bg-surface/60 text-muted'
        "
      >
        <AppIcon v-if="n <= value" name="x" :size="13" />
        <template v-else>{{ num(n) }}</template>
      </span>
    </div>
  </div>
</template>
