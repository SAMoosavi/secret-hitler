<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import type { PublicView } from '../../game/types'

const props = defineProps<{ view: PublicView }>()
const { t } = useI18n()

function nameOf(id: number | null): string {
  if (id === null) return '—'
  return props.view.players.find((p) => p.id === id)?.name ?? '—'
}
</script>

<template>
  <section class="min-w-0" :aria-label="t('game.title')">
    <div class="grid grid-cols-[repeat(auto-fit,minmax(5.5rem,1fr))] gap-1">
      <div class="nameplate !flex-col !items-stretch !gap-0 !px-1.5 !py-0.5">
        <span
          class="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-paper-muted"
        >
          <AppIcon name="crown" :size="11" class="text-brass" />
          {{ t('game.president') }}
        </span>
        <span class="w-full truncate text-base font-bold leading-tight text-ink-on-paper">
          {{ nameOf(view.presidentId) }}
        </span>
      </div>
      <div class="nameplate !flex-col !items-stretch !gap-0 !px-1.5 !py-0.5">
        <span
          class="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-paper-muted"
        >
          <AppIcon name="shield" :size="11" class="text-[var(--green)]" />
          {{ t('game.chancellor') }}
        </span>
        <span class="w-full truncate text-base font-bold leading-tight text-ink-on-paper">
          {{ nameOf(view.lastChancellorId) }}
        </span>
      </div>
      <div class="nameplate !flex-col !items-stretch !gap-0 !px-1.5 !py-0.5">
        <span
          class="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-paper-muted"
        >
          <AppIcon name="ballot" :size="11" class="text-liberal" />
          {{ t('game.nomineeShort') }}
        </span>
        <span class="w-full truncate text-base font-bold leading-tight text-ink-on-paper">
          {{ view.nomineeId === null ? '—' : nameOf(view.nomineeId) }}
        </span>
      </div>
    </div>
  </section>
</template>
