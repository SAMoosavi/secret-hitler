<script setup lang="ts">
import AppIcon from '../base/AppIcon.vue'
import type { IconName } from '../base/icons'

defineProps<{
  modelValue: string
  options: Array<{ value: string; label: string; icon?: IconName }>
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <button
      v-for="o in options"
      :key="o.value"
      type="button"
      class="btn btn-secondary gap-2"
      :class="modelValue === o.value ? '!border-gold !text-gold' : ''"
      :aria-pressed="modelValue === o.value"
      @click="emit('update:modelValue', o.value)"
    >
      <AppIcon v-if="o.icon" :name="o.icon" :size="17" />
      {{ o.label }}
    </button>
  </div>
</template>
