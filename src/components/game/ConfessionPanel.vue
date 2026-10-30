<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppDialog from '../base/AppDialog.vue'
import AppIcon from '../base/AppIcon.vue'
import type { GameState } from '../../game/types'

const props = defineProps<{ state: GameState; busy?: boolean }>()
const emit = defineEmits<{ acknowledge: [] }>()
const { t } = useI18n()

const ready = ref(false)
const action = ref<HTMLButtonElement | null>(null)

// The party shown is the snapshot taken when the power resolved; a later
// conversion must never rewrite this screen.
const party = computed(() => props.state.confession?.party ?? null)
const partyLabel = computed(() =>
  party.value === 'liberal'
    ? t('confession.partyLiberal')
    : party.value === 'communist'
      ? t('confession.partyCommunist')
      : t('confession.partyFascist'),
)

async function focusAction(): Promise<void> {
  await nextTick()
  action.value?.focus()
}

onMounted(() => void focusAction())

async function open(): Promise<void> {
  ready.value = true
  await focusAction()
}
</script>

<template>
  <AppDialog
    :open="true"
    :closeable="false"
    :title="ready ? t('confession.title') : t('confession.coverTitle')"
  >
    <template v-if="!ready">
      <p class="text-sm text-muted" role="status">{{ t('confession.coverBody') }}</p>
      <button
        ref="action"
        type="button"
        class="btn btn-primary mt-4 w-full"
        :disabled="busy"
        @click="open"
      >
        <AppIcon name="eye" :size="18" />
        {{ t('confession.presidentReady') }}
      </button>
    </template>
    <template v-else-if="party">
      <p class="text-sm text-muted">{{ t('confession.body') }}</p>
      <p class="mt-6 text-center text-4xl font-extrabold tracking-wide" dir="auto">
        {{ partyLabel }}
      </p>
      <button
        ref="action"
        type="button"
        class="btn btn-primary mt-8 w-full"
        :disabled="busy"
        @click="emit('acknowledge')"
      >
        <AppIcon name="check" :size="18" />
        {{ t('confession.seen') }}
      </button>
    </template>
  </AppDialog>
</template>
