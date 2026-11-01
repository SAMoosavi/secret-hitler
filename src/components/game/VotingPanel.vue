<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from '../base/AppIcon.vue'
import { confirmAction } from '../../stores/confirm'

defineProps<{ busy?: boolean }>()
const emit = defineEmits<{ vote: [approved: boolean] }>()
const { t } = useI18n()

async function submit(approved: boolean): Promise<void> {
  const ok = await confirmAction({
    title: approved ? t('voting.approveTitle') : t('voting.rejectTitle'),
    message: `${approved ? t('voting.approveBody') : t('voting.rejectBody')}\n\n${t('voting.note')}`,
    confirmLabel: approved ? t('voting.confirmApprove') : t('voting.confirmReject'),
    required: true,
    danger: !approved,
  })
  if (ok) emit('vote', approved)
}
</script>

<template>
  <section class="game-tray">
    <h2 class="text-base font-bold">{{ t('voting.title') }}</h2>
    <p class="text-xs text-muted">{{ t('voting.hint') }}</p>
    <div class="mt-1.5 grid grid-cols-2 gap-2">
      <button
        type="button"
        class="btn btn-primary min-h-14 flex-col !gap-1"
        :disabled="busy"
        @click="submit(true)"
      >
        <AppIcon name="check" :size="22" />
        <span class="text-sm">{{ t('voting.approve') }}</span>
      </button>
      <button
        type="button"
        class="btn btn-danger min-h-14 flex-col !gap-1"
        :disabled="busy"
        @click="submit(false)"
      >
        <AppIcon name="x" :size="22" />
        <span class="text-sm">{{ t('voting.reject') }}</span>
      </button>
    </div>
    <p class="text-center text-xs text-muted">{{ t('voting.note') }}</p>
  </section>
</template>
