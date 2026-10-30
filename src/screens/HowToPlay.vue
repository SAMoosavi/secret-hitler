<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import AppIcon from '../components/base/AppIcon.vue'

const { t } = useI18n()
const router = useRouter()

const sections = [
  ['objectiveTitle', 'objective'],
  ['rolesTitle', 'roles'],
  ['distributionTitle', 'distribution'],
  ['setupTitle', 'setup'],
  ['turnTitle', 'turn'],
  ['nominationTitle', 'nomination'],
  ['votingTitle', 'voting'],
  ['legislativeTitle', 'legislative'],
  ['executiveTitle', 'executive'],
  ['trackerTitle', 'tracker'],
  ['vetoTitle', 'veto'],
  ['victoryTitle', 'victory'],
  ['hitlerTitle', 'hitler'],
  ['expansionTitle', 'expansion'],
  ['expansionRolesTitle', 'expansionRoles'],
  ['expansionDeckTitle', 'expansionDeck'],
  ['expansionTrackTitle', 'expansionTrack'],
  ['expansionSecretTitle', 'expansionSecret'],
  ['expansionVictoryTitle', 'expansionVictory'],
] as const

const glossary = [
  ['policyTerm', 'policyDef'],
  ['trackerTerm', 'trackerDef'],
  ['chaosTerm', 'chaosDef'],
  ['powerTerm', 'powerDef'],
  ['termTerm', 'termDef'],
  ['vetoTerm', 'vetoDef'],
] as const

function back(): void {
  if (window.history.length > 1) router.back()
  else void router.push('/')
}
</script>

<template>
  <div class="page safe-x safe-top">
    <header class="flex items-center gap-2">
      <button type="button" class="icon-btn" :aria-label="t('common.back')" @click="back">
        <AppIcon name="back" :size="20" />
      </button>
      <h1 class="text-xl font-bold">{{ t('howTo.title') }}</h1>
    </header>

    <p class="mt-4 text-sm leading-relaxed text-muted">{{ t('howTo.intro') }}</p>

    <div class="mt-4 grid gap-2">
      <section v-for="[title, body] in sections" :key="title" class="panel p-3">
        <h2 class="text-base font-bold">{{ t(`howTo.${title}`) }}</h2>
        <p class="mt-1 text-sm leading-relaxed text-muted">{{ t(`howTo.${body}`) }}</p>
      </section>
    </div>

    <section class="panel mt-3 p-3">
      <h2 class="text-base font-bold">{{ t('howTo.glossaryTitle') }}</h2>
      <dl class="mt-2 grid gap-2 sm:grid-cols-2">
        <div v-for="[term, definition] in glossary" :key="term" class="rounded-lg border border-line bg-surface-2/60 p-2.5">
          <dt class="text-sm font-bold">{{ t(`howTo.glossary.${term}`) }}</dt>
          <dd class="mt-0.5 text-xs leading-relaxed text-muted">{{ t(`howTo.glossary.${definition}`) }}</dd>
        </div>
      </dl>
    </section>

    <p class="mt-3 rounded-lg border border-gold/40 bg-gold/10 p-3 text-sm leading-relaxed">
      {{ t('howTo.appNote') }}
    </p>
    <p class="mt-3 text-xs leading-relaxed text-muted">{{ t('about.attribution') }}</p>
    <p class="mt-1 text-xs leading-relaxed text-muted">{{ t('about.license') }}</p>
    <p class="mt-1 text-xs leading-relaxed text-muted">{{ t('about.expansionAttribution') }}</p>
  </div>
</template>
