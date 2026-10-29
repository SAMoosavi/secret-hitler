import { computed, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { createGame, selectPublicView, transition } from '../game/engine'
import type { GameAction, GameState, Policy, RuleError, SetupInput } from '../game/types'
import { storage } from '../platform/storage'

export const GAME_KEY = 'sh.game'
export const SAVE_VERSION = 1
export type LoadError = 'corrupt' | 'tooNew' | null

const PHASES = [
  'roleReveal',
  'nomination',
  'voting',
  'legislativePresident',
  'legislativeChancellor',
  'executive',
  'gameOver',
] as const
const ROLES = ['liberal', 'fascist', 'hitler'] as const
const POLICIES = ['liberal', 'fascist'] as const
const POWERS = ['investigate', 'peek', 'special', 'execute'] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isPolicy(value: unknown): value is Policy {
  return value === 'liberal' || value === 'fascist'
}

function isPolicyArray(value: unknown): value is Policy[] {
  return Array.isArray(value) && value.every(isPolicy)
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
  const migrated: Record<string, unknown> =
    version < 1
      ? {
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
      : data

  const players = migrated.players
  if (!Array.isArray(players) || players.length < 5 || players.length > 10) {
    return { error: 'corrupt' }
  }
  const ids = new Set<number>()
  for (const player of players) {
    if (
      !isRecord(player) ||
      !Number.isInteger(player.id) ||
      typeof player.name !== 'string' ||
      !ROLES.includes(player.role as (typeof ROLES)[number]) ||
      typeof player.alive !== 'boolean'
    ) {
      return { error: 'corrupt' }
    }
    const id = player.id as number
    if (ids.has(id)) return { error: 'corrupt' }
    ids.add(id)
  }

  if (!PHASES.includes(migrated.phase as (typeof PHASES)[number])) return { error: 'corrupt' }
  if (
    typeof migrated.presidentId !== 'number' ||
    !ids.has(migrated.presidentId) ||
    typeof migrated.enactedLiberal !== 'number' ||
    typeof migrated.enactedFascist !== 'number' ||
    typeof migrated.tracker !== 'number' ||
    typeof migrated.round !== 'number' ||
    !isPolicyArray(migrated.deck) ||
    !isPolicyArray(migrated.discard)
  ) {
    return { error: 'corrupt' }
  }
  if (migrated.nomineeId !== null && (typeof migrated.nomineeId !== 'number' || !ids.has(migrated.nomineeId))) {
    return { error: 'corrupt' }
  }
  if (migrated.gameOver !== null) {
    const over = migrated.gameOver
    if (
      !isRecord(over) ||
      !['liberal', 'fascist'].includes(over.winner as string) ||
      !['liberalPolicies', 'fascistPolicies', 'hitlerExecuted', 'hitlerElected'].includes(
        over.reason as string,
      )
    ) {
      return { error: 'corrupt' }
    }
  }
  if (migrated.pendingAction !== null) {
    const action = migrated.pendingAction
    if (!isRecord(action) || !POWERS.includes(action.type as (typeof POWERS)[number])) {
      return { error: 'corrupt' }
    }
  }

  // Each phase carries data the screen needs; a save missing it would render a
  // dead screen, so treat it as corrupt instead of resuming into it.
  if (migrated.phase === 'executive' && migrated.pendingAction === null) return { error: 'corrupt' }
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
  }

  const state: GameState = {
    ...(migrated as unknown as GameState),
    schemaVersion: 1,
    playerCount: players.length,
    players: players as GameState['players'],
    phase: migrated.phase as GameState['phase'],
    deck: migrated.deck,
    discard: migrated.discard,
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
