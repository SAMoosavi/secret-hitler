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

const face = computed(() => (props.faceUp && props.policy ? props.policy : 'back'))
const ICONS = { liberal: 'sun', fascist: 'crest', communist: 'star' } as const
const LABELS = {
  liberal: 'legislative.policyLiberal',
  fascist: 'legislative.policyFascist',
  communist: 'legislative.policyCommunist',
} as const
const label = computed(() =>
  face.value === 'back' ? t('legislative.cardsHidden') : t(LABELS[face.value]),
)
const faceIcon = computed(() => (face.value === 'back' ? 'lock' : ICONS[face.value]))
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
      <AppIcon :name="faceIcon" :size="size === 'sm' ? 18 : 24" />
      <span class="text-[0.6rem] font-bold uppercase tracking-widest opacity-80">
        {{ t('legislative.cardsHidden') }}
      </span>
    </template>
    <template v-else>
      <AppIcon :name="faceIcon" :size="size === 'sm' ? 22 : 30" />
      <span class="px-1 text-center text-[0.62rem] font-extrabold uppercase leading-tight tracking-wide">
        {{ label }}
      </span>
    </template>
  </component>
</template>
