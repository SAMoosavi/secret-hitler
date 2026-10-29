<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppDialog from './AppDialog.vue'
import { resolveConfirm, useConfirmState } from '../../stores/confirm'

const { t } = useI18n()
const active = useConfirmState()

function respond(value: boolean): void {
  resolveConfirm(value)
}
</script>

<template>
  <AppDialog
    :open="!!active"
    :title="active?.title ?? t('confirm.defaultTitle')"
    @close="respond(false)"
  >
    <p class="whitespace-pre-line text-sm leading-relaxed text-muted">
      {{ active?.message ?? t('confirm.defaultBody') }}
    </p>
    <template #actions>
      <button type="button" class="btn btn-secondary" @click="respond(false)">
        {{ active?.cancelLabel ?? t('common.cancel') }}
      </button>
      <button
        type="button"
        class="btn"
        :class="active?.danger ? 'btn-danger' : 'btn-primary'"
        @click="respond(true)"
      >
        {{ active?.confirmLabel ?? t('common.confirm') }}
      </button>
    </template>
  </AppDialog>
</template>
