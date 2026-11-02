<script setup lang="ts">
defineProps<{ label: string; value: string }>()
</script>

<template>
  <div class="panel p-3">
    <dt class="text-xs font-bold uppercase text-muted">{{ label }}</dt>
    <dd class="text-2xl font-bold">{{ value }}</dd>
  </div>
</template>
