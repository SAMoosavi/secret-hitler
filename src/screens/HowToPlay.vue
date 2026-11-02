<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import PageHeader from '../components/base/PageHeader.vue'
import RuleSection from '../components/howto/RuleSection.vue'

const { t } = useI18n()
const router = useRouter()

const sections = [
  { title: 'objectiveTitle', body: 'objective', open: true },
  { title: 'rolesTitle', body: 'roles', open: false },
  { title: 'distributionTitle', body: 'distribution', open: false },
  { title: 'setupTitle', body: 'setup', open: false },
  { title: 'turnTitle', body: 'turn', open: true },
  { title: 'nominationTitle', body: 'nomination', open: false },
  { title: 'votingTitle', body: 'voting', open: false },
  { title: 'legislativeTitle', body: 'legislative', open: false },
  { title: 'executiveTitle', body: 'executive', open: false },
  { title: 'trackerTitle', body: 'tracker', open: false },
  { title: 'vetoTitle', body: 'veto', open: false },
  { title: 'victoryTitle', body: 'victory', open: false },
  { title: 'hitlerTitle', body: 'hitler', open: false },
  { title: 'smallTitle', body: 'small', open: false },
  { title: 'expansionTitle', body: 'expansion', open: false },
  { title: 'expansionRolesTitle', body: 'expansionRoles', open: false },
  { title: 'expansionDeckTitle', body: 'expansionDeck', open: false },
  { title: 'expansionTrackTitle', body: 'expansionTrack', open: false },
  { title: 'expansionSecretTitle', body: 'expansionSecret', open: false },
  { title: 'expansionVictoryTitle', body: 'expansionVictory', open: false },
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
    <PageHeader :title="t('howTo.title')" @back="back" />

    <p class="mt-4 text-sm leading-relaxed text-muted">{{ t('howTo.intro') }}</p>

    <div class="mt-4 grid gap-2">
      <RuleSection
        v-for="section in sections"
        :key="section.title"
        :title="t(`howTo.${section.title}`)"
        :open="section.open"
      >
        {{ t(`howTo.${section.body}`) }}
      </RuleSection>
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
