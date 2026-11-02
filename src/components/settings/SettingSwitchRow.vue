<script setup lang="ts">
import AppIcon from '../base/AppIcon.vue'
import type { IconName } from '../base/icons'

defineProps<{
  modelValue: boolean
  label: string
  hint?: string
  icon?: IconName
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <div class="flex items-center justify-between gap-3">
    <div class="flex min-w-0 items-start gap-2">
      <AppIcon v-if="icon" :name="icon" :size="18" class="mt-0.5 shrink-0 text-muted" />
      <div class="min-w-0">
        <p class="text-sm font-bold">{{ label }}</p>
        <p v-if="hint" class="text-xs text-muted">{{ hint }}</p>
      </div>
    </div>
    <button
      type="button"
      class="switch"
      role="switch"
      :aria-checked="modelValue"
      :aria-label="label"
      @click="emit('update:modelValue', !modelValue)"
    />
  </div>
</template>
