<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import AppIcon from './AppIcon.vue'
import type { Policy } from '../../game/types'

const props = withDefaults(
  defineProps<{
    policy?: Policy | null
    faceUp?: boolean
    size?: 'sm' | 'md' | 'lg' | 'slot'
    clickable?: boolean
    disabled?: boolean
    /** Board cards sit in a die-cut slot and are tilted slightly. */
    seated?: boolean
  }>(),
  { policy: null, faceUp: false, size: 'md', clickable: false, disabled: false, seated: false },
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
const faceIcon = computed(() => (face.value === 'back' ? 'crest' : ICONS[face.value]))
const width = computed(() => ({ sm: '3.5rem', md: '5rem', lg: '6rem', slot: undefined })[props.size])
const iconSize = computed(() => {
  if (props.size === 'slot') return 20
  return props.size === 'sm' ? 20 : props.size === 'md' ? 26 : 32
})
</script>

<template>
  <component
    :is="clickable ? 'button' : 'div'"
    :type="clickable ? 'button' : undefined"
    class="policy-card"
    :class="[
      face,
      size === 'slot' ? 'slot' : '',
      seated ? 'seated' : '',
      clickable ? 'cursor-pointer card-pick' : '',
    ]"
    :style="size === 'slot' ? undefined : { width }"
    :disabled="clickable ? disabled : undefined"
    :aria-label="label"
    @click="clickable && !disabled ? emit('select') : undefined"
  >
    <template v-if="face === 'back'">
      <AppIcon :name="faceIcon" :size="iconSize" />
    </template>
    <template v-else>
      <AppIcon :name="faceIcon" :size="iconSize" />
      <span
        v-if="size !== 'slot'"
        class="px-1 text-center text-xs font-extrabold uppercase leading-tight tracking-wide"
      >
        {{ label }}
      </span>
    </template>
  </component>
</template>
