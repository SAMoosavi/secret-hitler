<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import { confirmAction } from '../../stores/confirm'
import { useGameStore } from '../../stores/game'
import { formatNumber } from '../../i18n/format'
import type { GameState } from '../../game/types'

const props = defineProps<{ state: GameState }>()
const { t, locale } = useI18n()
const num = (value: number): string => formatNumber(value, locale.value)
const router = useRouter()
const game = useGameStore()

const over = computed(() => props.state.gameOver)
const liberal = computed(() => over.value?.winner === 'liberal')
const reason = computed(() => {
  const key = over.value?.reason
  return key ? t(`gameOver.${key}`) : ''
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
  <AppDialog :open="true" :closeable="false" :title="liberal ? t('gameOver.liberalWin') : t('gameOver.fascistWin')">
    <div class="flex flex-col items-center gap-2 py-2 text-center">
      <span
        class="flex h-16 w-16 items-center justify-center rounded-full border-2"
        :class="liberal ? 'border-liberal bg-liberal/15 text-liberal' : 'border-fascist bg-fascist/15 text-fascist'"
      >
        <AppIcon :name="liberal ? 'sun' : 'crest'" :size="36" />
      </span>
      <p class="mt-1 text-sm text-muted">{{ reason }}</p>
      <p class="text-[0.7rem] text-muted">
        {{ t('gameOver.summary', { round: num(state.round), liberal: num(state.enactedLiberal), fascist: num(state.enactedFascist) }) }}
      </p>
    </div>
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
