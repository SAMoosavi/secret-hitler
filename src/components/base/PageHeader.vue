<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'

defineProps<{ title: string; eyebrow?: string }>()
const emit = defineEmits<{ back: [] }>()

const { t } = useI18n()
</script>

<template>
  <header class="flex items-center gap-2">
    <button type="button" class="icon-btn" :aria-label="t('common.back')" @click="emit('back')">
      <AppIcon name="back" :size="20" />
    </button>
    <div class="min-w-0 flex-1">
      <p v-if="eyebrow" class="eyebrow">{{ eyebrow }}</p>
      <h1 class="truncate text-xl font-bold">{{ title }}</h1>
    </div>
  </header>
</template>
