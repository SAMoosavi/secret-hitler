import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { createGame, selectPublicView, transition } from '../game/engine'
import {
  COMMUNIST_TRACK,
  EXPANSION_MIN,
  FASCIST_TRACK,
  LIBERAL_TRACK,
  MAX_PLAYERS,
  MIN_PLAYERS,
  partyForRole,
  roleCounts,
} from '../game/constants'
import type {
  GameAction,
  GameState,
  Party,
  Policy,
  Role,
  RuleError,
  SetupInput,
  Winner,
  WinReason,
} from '../game/types'
import { storage } from '../platform/storage'

export const GAME_KEY = 'sh.game'
export const SAVE_VERSION = 2
export type LoadError = 'corrupt' | 'tooNew' | null

const PHASES = [
  'roleReveal',
  'nomination',
  'voting',
  'legislativePresident',
  'legislativeChancellor',
  'executive',
  'communistPower',
  'radicalisationReveal',
  'gameOver',
] as const
const ROLES = ['liberal', 'fascist', 'hitler', 'communist'] as const
const PARTIES = ['liberal', 'fascist', 'communist'] as const
const POLICIES = ['liberal', 'fascist', 'communist'] as const
const POWERS = [
  'investigate',
  'peek',
  'special',
  'execute',
  'radicalise',
  'fiveYearPlan',
  'confession',
] as const
const EXPANSION_POWERS = ['radicalise', 'fiveYearPlan', 'confession'] as const
const BASE_POWERS = ['investigate', 'peek', 'special', 'execute'] as const
const REASONS = [
  'liberalPolicies',
  'fascistPolicies',
  'communistPolicies',
  'hitlerExecuted',
  'hitlerElected',
] as const

/** Parties reachable from each role: Radicalisation only ever adds Communist. */
const LEGAL_PARTIES: Record<Role, readonly Party[]> = {
  liberal: ['liberal', 'communist'],
  fascist: ['fascist', 'communist'],
  hitler: ['fascist'],
  communist: ['communist'],
}

/** The exact winner set each ending must carry, or null when impossible. */
function expectedWinners(reason: WinReason, isBase: boolean): Winner[] | null {
  switch (reason) {
    case 'liberalPolicies':
      return ['liberal']
    case 'fascistPolicies':
    case 'hitlerElected':
      return ['fascist']
    case 'hitlerExecuted':
      return isBase ? ['liberal'] : ['liberal', 'communist']
    case 'communistPolicies':
      return isBase ? null : ['communist']
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isParty(value: unknown): value is Party {
  return PARTIES.includes(value as (typeof PARTIES)[number])
}

function isPolicy(value: unknown): value is Policy {
  return POLICIES.includes(value as (typeof POLICIES)[number])
}

function isPolicyArray(value: unknown): value is Policy[] {
  return Array.isArray(value) && value.every(isPolicy)
}

/** v1 saves stored one `winner`; v2 stores a `winners` array. */
function normalizeGameOver(value: unknown): unknown {
  if (!isRecord(value) || Array.isArray(value.winners)) return value
  if (typeof value.winner !== 'string') return value
  return { winners: [value.winner], reason: value.reason }
}

type Parsed = { state: GameState } | { error: Exclude<LoadError, null> }

export function parseSave(raw: string): Parsed {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return { error: 'corrupt' }
  }
  if (!isRecord(data)) return { error: 'corrupt' }

  const version = typeof data.schemaVersion === 'number' ? data.schemaVersion : 0
  if (version > SAVE_VERSION) return { error: 'tooNew' }

  // v0 was the pre-schema draft: same core fields, no schemaVersion/defaults.
  let migrated: Record<string, unknown> = data
  if (version < 1) {
    migrated = {
      ...data,
      schemaVersion: 1,
      id: data.id ?? `legacy-${Date.now()}`,
      createdAt: data.createdAt ?? Date.now(),
      lastElection: data.lastElection ?? null,
      lastPresidentId: data.lastPresidentId ?? null,
      lastChancellorId: data.lastChancellorId ?? null,
      revealIndex: data.revealIndex ?? 0,
      legislative: data.legislative ?? null,
      pendingAction: data.pendingAction ?? null,
      peeked: data.peeked ?? null,
      investigation: data.investigation ?? null,
      investigated: data.investigated ?? [],
      vetoUnlocked: data.vetoUnlocked ?? false,
      specialReturnId: data.specialReturnId ?? null,
      gameOver: data.gameOver ?? null,
      round: data.round ?? 1,
      tracker: data.tracker ?? 0,
    }
  }

  if (version < 2) {
    migrated = {
      ...migrated,
      schemaVersion: 2,
      expansion:
        Array.isArray(migrated.players) && migrated.players.length >= EXPANSION_MIN
          ? 'communist'
          : null,
      enactedCommunist: 0,
      confessions: [],
      radicalisation: null,
      confession: null,
    }
  }

  // v1 players carry no party. v2 stores the current party, which
  // Radicalisation may have changed, so only fill the field when it is absent.
  migrated = {
    ...migrated,
    gameOver: normalizeGameOver(migrated.gameOver),
    players: Array.isArray(migrated.players)
      ? migrated.players.map((player) => {
          if (!isRecord(player) || isParty(player.party)) return player
          const role = player.role
          return ROLES.includes(role as (typeof ROLES)[number])
            ? { ...player, party: partyForRole(role as Role) }
            : player
        })
      : migrated.players,
  }

  const players = migrated.players
  if (!Array.isArray(players) || players.length < MIN_PLAYERS || players.length > MAX_PLAYERS) {
    return { error: 'corrupt' }
  }
  const ids = new Set<number>()
  const roles = new Map<number, Role>()
  const tally: Record<Role, number> = { liberal: 0, fascist: 0, communist: 0, hitler: 0 }
  for (const player of players) {
    if (
      !isRecord(player) ||
      !Number.isInteger(player.id) ||
      typeof player.name !== 'string' ||
      !ROLES.includes(player.role as (typeof ROLES)[number]) ||
      !isParty(player.party) ||
      typeof player.alive !== 'boolean'
    ) {
      return { error: 'corrupt' }
    }
    const role = player.role as Role
    // The secret role never changes; Radicalisation only ever rewrites party to Communist.
    if (!LEGAL_PARTIES[role].includes(player.party as Party)) return { error: 'corrupt' }
    tally[role] += 1
    const id = player.id as number
    if (ids.has(id)) return { error: 'corrupt' }
    ids.add(id)
    roles.set(id, role)
  }
  // Role distribution must be exactly the official table for this player count.
  const counts = roleCounts(players.length)
  if (
    !counts ||
    tally.liberal !== counts.liberal ||
    tally.fascist !== counts.fascist ||
    tally.hitler !== counts.hitler ||
    tally.communist !== (counts.communist ?? 0)
  ) {
    return { error: 'corrupt' }
  }

  const isBase = players.length < EXPANSION_MIN
  const expectedExpansion = isBase ? null : 'communist'
  if (migrated.expansion !== expectedExpansion) return { error: 'corrupt' }
  if (isBase && players.some((player) => player.role === 'communist' || player.party === 'communist')) {
    return { error: 'corrupt' }
  }

  if (!PHASES.includes(migrated.phase as (typeof PHASES)[number])) return { error: 'corrupt' }
  if (isBase && (migrated.phase === 'communistPower' || migrated.phase === 'radicalisationReveal')) {
    return { error: 'corrupt' }
  }
  if (
    typeof migrated.presidentId !== 'number' ||
    !ids.has(migrated.presidentId) ||
    typeof migrated.enactedLiberal !== 'number' ||
    typeof migrated.enactedFascist !== 'number' ||
    !Number.isInteger(migrated.enactedCommunist) ||
    (migrated.enactedCommunist as number) < 0 ||
    (migrated.enactedCommunist as number) > COMMUNIST_TRACK ||
    typeof migrated.tracker !== 'number' ||
    typeof migrated.round !== 'number' ||
    !isPolicyArray(migrated.deck) ||
    !isPolicyArray(migrated.discard) ||
    (migrated.peeked !== null && !isPolicyArray(migrated.peeked))
  ) {
    return { error: 'corrupt' }
  }
  // A full track means that ending has already fired, so the game must be over.
  const trackFull =
    (migrated.enactedLiberal as number) >= LIBERAL_TRACK ||
    (migrated.enactedFascist as number) >= FASCIST_TRACK ||
    (!isBase && (migrated.enactedCommunist as number) >= COMMUNIST_TRACK)
  if (trackFull && migrated.phase !== 'gameOver') return { error: 'corrupt' }
  if (migrated.investigation !== null) {
    const investigation = migrated.investigation
    if (
      !isRecord(investigation) ||
      typeof investigation.playerId !== 'number' ||
      !ids.has(investigation.playerId) ||
      !isParty(investigation.party)
    ) {
      return { error: 'corrupt' }
    }
    if (isBase && investigation.party === 'communist') return { error: 'corrupt' }
  }
  if (
    isBase &&
    ((migrated.deck as Policy[]).includes('communist') ||
      (migrated.discard as Policy[]).includes('communist') ||
      (migrated.peeked as Policy[] | null)?.includes('communist'))
  ) {
    return { error: 'corrupt' }
  }
  if (isBase && migrated.enactedCommunist !== 0) return { error: 'corrupt' }
  if (migrated.nomineeId !== null && (typeof migrated.nomineeId !== 'number' || !ids.has(migrated.nomineeId))) {
    return { error: 'corrupt' }
  }
  if (migrated.gameOver !== null) {
    if (migrated.phase !== 'gameOver') return { error: 'corrupt' }
    const over = migrated.gameOver
    if (!isRecord(over) || !Array.isArray(over.winners)) return { error: 'corrupt' }
    if (!REASONS.includes(over.reason as (typeof REASONS)[number])) return { error: 'corrupt' }
    const winners = expectedWinners(over.reason as WinReason, isBase)
    if (
      winners === null ||
      over.winners.length !== winners.length ||
      over.winners.some((winner, index) => winner !== winners[index])
    ) {
      return { error: 'corrupt' }
    }
  }
  const pending = migrated.pendingAction
  if (pending !== null) {
    if (
      !isRecord(pending) ||
      !POWERS.includes(pending.type as (typeof POWERS)[number]) ||
      !Number.isInteger(pending.actorId) ||
      !ids.has(pending.actorId as number)
    ) {
      return { error: 'corrupt' }
    }
    const type = pending.type as (typeof POWERS)[number]
    const executive = migrated.phase === 'executive' && (BASE_POWERS as readonly string[]).includes(type)
    const communistPower =
      migrated.phase === 'communistPower' &&
      !isBase &&
      (EXPANSION_POWERS as readonly string[]).includes(type)
    // A pending action only exists while its phase can resolve it.
    if (!executive && !communistPower) return { error: 'corrupt' }
  }
  const confessions = migrated.confessions
  if (!Array.isArray(confessions)) return { error: 'corrupt' }
  for (const confession of confessions) {
    if (
      !isRecord(confession) ||
      typeof confession.playerId !== 'number' ||
      !ids.has(confession.playerId) ||
      !isParty(confession.party) ||
      typeof confession.round !== 'number'
    ) {
      return { error: 'corrupt' }
    }
    const role = roles.get(confession.playerId)
    // A historical record can predate a later conversion, but the party is
    // always one that player's role can have held.
    if (!role || !LEGAL_PARTIES[role].includes(confession.party)) {
      return { error: 'corrupt' }
    }
  }
  if (isBase && confessions.length > 0) return { error: 'corrupt' }

  const radicalisation = migrated.radicalisation
  if (radicalisation !== null) {
    if (
      !isRecord(radicalisation) ||
      typeof radicalisation.targetId !== 'number' ||
      !ids.has(radicalisation.targetId) ||
      !isParty(radicalisation.before) ||
      !isParty(radicalisation.after) ||
      !Number.isInteger(radicalisation.revealIndex) ||
      migrated.phase !== 'radicalisationReveal' ||
      pending !== null
    ) {
      return { error: 'corrupt' }
    }
    const target = players.find(
      (player) => (player as { id: number }).id === radicalisation.targetId,
    ) as { role: Role; party: Party; alive: boolean } | undefined
    const living = players.filter((player) => (player as { alive: boolean }).alive).length
    const revealIndex = radicalisation.revealIndex as number
    if (!target || !target.alive || revealIndex < 0 || revealIndex > living) {
      return { error: 'corrupt' }
    }
    // Hitler and existing Communists are no-ops; anyone else becomes Communist.
    const after =
      target.role === 'hitler' || radicalisation.before === 'communist'
        ? radicalisation.before
        : 'communist'
    if (radicalisation.after !== after || target.party !== after) {
      return { error: 'corrupt' }
    }
  }
  if (migrated.confession !== null) {
    const snapshot = migrated.confession
    if (
      !isRecord(snapshot) ||
      !isRecord(pending) ||
      pending.type !== 'confession' ||
      typeof snapshot.playerId !== 'number' ||
      !ids.has(snapshot.playerId) ||
      !isParty(snapshot.party) ||
      snapshot.playerId !== pending.actorId
    ) {
      return { error: 'corrupt' }
    }
  } else if (isRecord(pending) && pending.type === 'confession') {
    return { error: 'corrupt' }
  }

  // Each phase carries data the screen needs; a save missing it would render a
  // dead screen, so treat it as corrupt instead of resuming into it.
  if (migrated.phase === 'executive' && migrated.pendingAction === null) return { error: 'corrupt' }
  if (migrated.phase === 'communistPower' && migrated.pendingAction === null) {
    return { error: 'corrupt' }
  }
  if (migrated.phase === 'radicalisationReveal' && radicalisation === null) {
    return { error: 'corrupt' }
  }
  if (migrated.phase === 'gameOver' && migrated.gameOver === null) return { error: 'corrupt' }
  if (migrated.phase === 'legislativePresident' || migrated.phase === 'legislativeChancellor') {
    const leg = migrated.legislative
    if (
      !isRecord(leg) ||
      !isPolicyArray(leg.presidentHand) ||
      !isPolicyArray(leg.chancellorHand) ||
      (leg.presidentDiscard !== null && !isPolicy(leg.presidentDiscard)) ||
      typeof leg.vetoRequested !== 'boolean'
    ) {
      return { error: 'corrupt' }
    }
    if (isBase) {
      const cards = [
        ...(leg.presidentHand as Policy[]),
        ...(leg.chancellorHand as Policy[]),
        leg.presidentDiscard as Policy | null,
      ]
      if (cards.includes('communist')) return { error: 'corrupt' }
    }
  }

  const state: GameState = {
    ...(migrated as unknown as GameState),
    schemaVersion: 2,
    expansion: expectedExpansion,
    playerCount: players.length,
    players: players as GameState['players'],
    phase: migrated.phase as GameState['phase'],
    deck: migrated.deck as Policy[],
    discard: migrated.discard as Policy[],
    enactedCommunist: migrated.enactedCommunist as number,
    confessions: confessions as GameState['confessions'],
    radicalisation: (migrated.radicalisation as GameState['radicalisation']) ?? null,
    confession: (migrated.confession as GameState['confession']) ?? null,
    gameOver: (migrated.gameOver as GameState['gameOver']) ?? null,
    investigated: Array.isArray(migrated.investigated) ? (migrated.investigated as number[]) : [],
    revealIndex:
      typeof migrated.revealIndex === 'number'
        ? Math.max(0, Math.min(players.length - 1, migrated.revealIndex))
        : 0,
  }
  return { state }
}

export const useGameStore = defineStore('game', () => {
  const state = shallowRef<GameState | null>(null)
  const initialized = shallowRef(false)
  const hasSave = shallowRef(false)
  const loadError = shallowRef<LoadError>(null)
  const saveError = shallowRef<string | null>(null)
  const lastError = shallowRef<RuleError | null>(null)
  const busy = shallowRef(false)
  // Set when a session is resumed from disk; screens show a privacy cover until
  // the operator confirms the phone is in the right hands (AC-27).
  const restored = shallowRef(false)

  const publicView = computed(() => (state.value ? selectPublicView(state.value) : null))
  const resumeAvailable = computed(() => state.value !== null)

  async function init(): Promise<void> {
    if (initialized.value) return
    initialized.value = true
    let raw: string | null = null
    try {
      raw = await storage.get(GAME_KEY)
    } catch {
      return
    }
    if (!raw) return
    hasSave.value = true
    const parsed = parseSave(raw)
    if ('error' in parsed) {
      loadError.value = parsed.error
      return
    }
    state.value = parsed.state
    restored.value = true
  }

  async function persist(next: GameState): Promise<boolean> {
    try {
      await storage.set(GAME_KEY, JSON.stringify(next))
      saveError.value = null
      return true
    } catch {
      saveError.value = 'errors.saveFailed'
      return false
    }
  }

  async function startGame(input: SetupInput): Promise<boolean> {
    if (busy.value) return false
    const created = createGame(input)
    if (!created.ok) {
      lastError.value = created.error
      return false
    }
    busy.value = true
    try {
      if (!(await persist(created.state))) return false
      state.value = created.state
      hasSave.value = true
      restored.value = false
      loadError.value = null
      lastError.value = null
      return true
    } finally {
      busy.value = false
    }
  }

  async function commit(action: GameAction): Promise<boolean> {
    if (busy.value) return false
    if (!state.value) {
      lastError.value = { code: 'invalidPhase' }
      return false
    }
    busy.value = true
    try {
      const result = transition(state.value, action)
      if (!result.ok) {
        lastError.value = result.error
        return false
      }
      if (!(await persist(result.state))) return false
      state.value = result.state
      lastError.value = null
      return true
    } finally {
      busy.value = false
    }
  }

  async function discardGame(): Promise<void> {
    await storage.remove(GAME_KEY)
    state.value = null
    hasSave.value = false
    restored.value = false
    loadError.value = null
    saveError.value = null
    lastError.value = null
  }

  function clearErrors(): void {
    loadError.value = null
    saveError.value = null
    lastError.value = null
  }

  function acknowledgeRestore(): void {
    restored.value = false
  }

  return {
    state,
    publicView,
    hasSave,
    resumeAvailable,
    loadError,
    saveError,
    lastError,
    busy,
    restored,
    init,
    startGame,
    commit,
    discardGame,
    clearErrors,
    acknowledgeRestore,
  }
})
