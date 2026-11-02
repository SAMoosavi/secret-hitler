<script setup lang="ts">
defineProps<{ title: string; hint?: string }>()
</script>

<template>
  <section class="panel p-3">
    <h2 class="eyebrow">{{ title }}</h2>
    <p v-if="hint" class="mt-0.5 text-xs text-muted">{{ hint }}</p>
    <slot />
  </section>
</template>
