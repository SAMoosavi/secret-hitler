<script setup lang="ts">
import AppIcon from '../base/AppIcon.vue'

defineProps<{ title: string; open?: boolean }>()
</script>

<template>
  <details class="panel howto" :open="open">
    <summary>
      <h2 class="text-base font-bold">{{ title }}</h2>
      <AppIcon name="chevron" :size="16" class="chev" aria-hidden="true" />
    </summary>
    <p class="px-3 pb-3 text-sm leading-relaxed text-muted"><slot /></p>
  </details>
</template>
