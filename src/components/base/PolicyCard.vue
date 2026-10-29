<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import type { Policy } from '../../game/types'

const props = withDefaults(
  defineProps<{
    policy?: Policy | null
    faceUp?: boolean
    size?: 'sm' | 'md' | 'lg'
    clickable?: boolean
    disabled?: boolean
  }>(),
  { policy: null, faceUp: false, size: 'md', clickable: false, disabled: false },
)
const emit = defineEmits<{ select: [] }>()
const { t } = useI18n()

const isLiberal = computed(() => props.policy === 'liberal')
const face = computed(() => (props.faceUp && props.policy ? props.policy : 'back'))
const label = computed(() => {
  if (!props.faceUp || !props.policy) return t('legislative.cardsHidden')
  return isLiberal.value ? t('legislative.policyLiberal') : t('legislative.policyFascist')
})
const width = computed(
  () => ({ sm: '3.5rem', md: '5rem', lg: '6rem' })[props.size],
)
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    class="policy-card"
    :class="[face, clickable ? 'cursor-pointer' : '']"
    :style="{ width }"
    :disabled="clickable ? disabled : undefined"
    :aria-label="label"
    @click="clickable && !disabled ? emit('select') : undefined"
  >
    <template v-if="face === 'back'">
      <AppIcon name="lock" :size="size === 'sm' ? 18 : 24" />
      <span class="text-[0.6rem] font-bold uppercase tracking-widest opacity-80">
        {{ t('legislative.cardsHidden') }}
      </span>
    </template>
    <template v-else>
      <AppIcon :name="isLiberal ? 'sun' : 'crest'" :size="size === 'sm' ? 22 : 30" />
      <span class="px-1 text-center text-[0.62rem] font-extrabold uppercase leading-tight tracking-wide">
        {{ label }}
      </span>
    </template>
  </component>
</template>
