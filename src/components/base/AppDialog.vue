<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title?: string
    closeable?: boolean
    wide?: boolean
  }>(),
  { closeable: true, wide: false },
)
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)

function sync(open: boolean): void {
  const el = dialog.value
  if (!el) return
  if (open && !el.open) {
    el.showModal()
    document.body.style.overflow = 'hidden'
  } else if (!open && el.open) {
    el.close()
    document.body.style.overflow = ''
  }
}

watch(
  () => props.open,
  async (open) => {
    await nextTick()
    sync(open)
  },
  { flush: 'post' },
)

function onCancel(event: Event): void {
  if (!props.closeable) {
    event.preventDefault()
    return
  }
  emit('close')
}

function onBackdrop(event: MouseEvent): void {
  if (props.closeable && event.target === dialog.value) emit('close')
}

function onNativeClose(): void {
  document.body.style.overflow = ''
  emit('close')
}

onMounted(() => {
  sync(props.open)
})

onBeforeUnmount(() => {
  document.body.style.overflow = ''
})
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog"
    :class="{ 'dialog-wide': wide }"
    :aria-label="title"
    @cancel="onCancel"
    @close="onNativeClose"
    @click="onBackdrop"
  >
    <div
      class="dialog-card panel panel-raised max-h-[90dvh] overflow-y-auto p-5 text-start"
      :class="wide ? 'sm:max-w-3xl' : ''"
    >
      <header class="mb-4 flex items-start justify-between gap-3">
        <div>
          <slot name="title">
            <h2 v-if="title" class="text-xl font-bold">{{ title }}</h2>
          </slot>
        </div>
        <button
          v-if="closeable"
          type="button"
          class="icon-btn shrink-0"
          :aria-label="$t('common.close')"
          @click="emit('close')"
        >
          <AppIcon name="close" :size="20" />
        </button>
      </header>
      <slot />
      <footer v-if="$slots.actions" class="mt-5 flex flex-wrap justify-end gap-2">
        <slot name="actions" />
      </footer>
    </div>
  </dialog>
</template>
