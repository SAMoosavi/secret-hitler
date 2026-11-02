<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div class="flex items-center justify-between gap-2 p-3">
    <span class="text-sm text-muted">{{ label }}</span>
    <span class="text-end font-bold"><slot /></span>
  </div>
</template>
