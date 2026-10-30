import {
  HAND_SIZE,
  COMMUNIST_TRACK,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TRACKER_MAX,
  communistPowerFor,
  fascistTrackFor,
  isExpansion,
  liberalTrackFor,
  partyForRole,
  powerFor,
  roleCounts,
  rolesFor,
} from './constants'
import { drawCards, growDeckForFiveYearPlan, makeDeck, peekCards } from './deck'
import { secureRng, shuffle, type Rng } from './rng'
import type {
  ActionResult,
  Eligibility,
  GameAction,
  GameOver,
  GameState,
  KnowledgeEntry,
  Player,
  Policy,
  PublicView,
  RuleError,
  RuleErrorCode,
  SetupInput,
} from './types'

function fail(code: RuleErrorCode, params?: RuleError['params']): RuleError {
  return { code, params }
}

export function normalizeName(raw: string, index: number): string {
  const cleaned = raw.normalize('NFKC').replace(/\s+/g, ' ').trim()
  return cleaned || `Player ${index + 1}`
}

export function validateSetup(input: SetupInput): RuleError | null {
  if (
    !Number.isInteger(input.playerCount) ||
    input.playerCount < MIN_PLAYERS ||
    input.playerCount > MAX_PLAYERS
  ) {
    return fail('invalidPlayerCount', { min: MIN_PLAYERS, max: MAX_PLAYERS })
  }
  if (!Array.isArray(input.names) || input.names.length !== input.playerCount) {
    return fail('invalidPlayerCount', { min: MIN_PLAYERS, max: MAX_PLAYERS })
  }
  const seen = new Set<string>()
  for (const [i, raw] of input.names.entries()) {
    const key = normalizeName(raw, i).toLocaleLowerCase()
    if (seen.has(key)) return fail('duplicateNames', { name: key })
    seen.add(key)
  }
  return null
}

export interface CreatedGame {
  ok: true
  state: GameState
}

export type CreateResult = CreatedGame | { ok: false; error: RuleError }

export function createGame(
  input: SetupInput,
  rng: Rng = secureRng(),
  meta: { now?: number; id?: string } = {},
): CreateResult {
  const error = validateSetup(input)
  if (error) return { ok: false, error }

  const roles = rolesFor(input.playerCount)
  const counts = roleCounts(input.playerCount)
  if (!roles || !counts) return { ok: false, error: fail('invalidPlayerCount') }

  const shuffledRoles = shuffle(roles, rng)
  const players: Player[] = input.names.map((raw, i) => ({
    id: i,
    name: normalizeName(raw, i),
    role: shuffledRoles[i],
    party: partyForRole(shuffledRoles[i]),
    alive: true,
  }))

  const state: GameState = {
    schemaVersion: 2,
    expansion: isExpansion(input.playerCount) ? 'communist' : null,
    id: meta.id ?? globalThis.crypto.randomUUID(),
    createdAt: meta.now ?? Date.now(),
    playerCount: input.playerCount,
    players,
    phase: 'roleReveal',
    presidentId: Math.floor(rng() * input.playerCount),
    nomineeId: null,
    lastElection: null,
    lastPresidentId: null,
    lastChancellorId: null,
    enactedLiberal: 0,
    enactedFascist: 0,
    enactedCommunist: 0,
    deck: shuffle(makeDeck(input.playerCount), rng),
    discard: [],
    tracker: 0,
    round: 1,
    revealIndex: 0,
    legislative: null,
    pendingAction: null,
    peeked: null,
    investigation: null,
    investigated: [],
    vetoUnlocked: false,
    specialReturnId: null,
    confessions: [],
    radicalisation: null,
    confession: null,
    gameOver: null,
  }
  return { ok: true, state }
}

export function livingPlayers(state: GameState): Player[] {
  return state.players.filter((p) => p.alive)
}

export function playerById(state: GameState, id: number): Player | undefined {
  return state.players.find((p) => p.id === id)
}

export function eligibility(state: GameState, playerId: number): Eligibility {
  const player = playerById(state, playerId)
  if (!player) return { playerId, eligible: false, reason: 'dead' }
  if (!player.alive) return { playerId, eligible: false, reason: 'dead' }
  if (player.id === state.presidentId) return { playerId, eligible: false, reason: 'president' }
  const living = livingPlayers(state).length
  // Exactly 5 live is the official exception; 3 survivors (5-6 player games
  // after two executions) would otherwise have no nominee at all.
  const fiveRemain = living === 5 || living <= 3
  if (state.lastChancellorId === playerId) {
    return { playerId, eligible: false, reason: 'termChancellor' }
  }
  if (state.lastPresidentId === playerId && !fiveRemain) {
    return { playerId, eligible: false, reason: 'termPresident' }
  }
  return { playerId, eligible: true, reason: 'ok' }
}

export function eligibilities(state: GameState): Eligibility[] {
  return state.players.map((p) => eligibility(state, p.id))
}

function nextLivingAfter(state: GameState, id: number): number {
  const index = state.players.findIndex((p) => p.id === id)
  const n = state.players.length
  for (let step = 1; step <= n; step++) {
    const candidate = state.players[(index + step) % n]
    if (candidate.alive) return candidate.id
  }
  return id
}

function nextLivingFrom(state: GameState, id: number): number {
  const player = playerById(state, id)
  return player?.alive ? id : nextLivingAfter(state, id)
}

function startNextRound(state: GameState): void {
  const current = state.presidentId
  const returnTo = state.specialReturnId
  state.specialReturnId = null
  state.presidentId = returnTo !== null ? nextLivingFrom(state, returnTo) : nextLivingAfter(state, current)
  state.round += 1
  state.phase = 'nomination'
  state.nomineeId = null
  state.legislative = null
  state.pendingAction = null
  state.peeked = null
  state.investigation = null
  state.radicalisation = null
  state.confession = null
}

function enactPolicy(state: GameState, policy: Policy): void {
  if (policy === 'liberal') state.enactedLiberal += 1
  else if (policy === 'fascist') state.enactedFascist += 1
  else state.enactedCommunist += 1
  state.tracker = 0
  if (state.enactedFascist >= 5) state.vetoUnlocked = true
}

function setGameOver(state: GameState, over: GameOver): void {
  state.phase = 'gameOver'
  state.gameOver = over
  state.legislative = null
  state.pendingAction = null
  state.peeked = null
  state.investigation = null
  state.nomineeId = null
  state.radicalisation = null
  state.confession = null
}

function checkPolicyVictory(state: GameState): boolean {
  if (isExpansion(state.playerCount) && state.enactedCommunist >= COMMUNIST_TRACK) {
    setGameOver(state, { winners: ['communist'], reason: 'communistPolicies' })
    return true
  }
  if (state.enactedLiberal >= liberalTrackFor(state.playerCount)) {
    setGameOver(state, { winners: ['liberal'], reason: 'liberalPolicies' })
    return true
  }
  if (state.enactedFascist >= fascistTrackFor(state.playerCount)) {
    setGameOver(state, { winners: ['fascist'], reason: 'fascistPolicies' })
    return true
  }
  return false
}

function beginLegislative(state: GameState, rng: Rng): void {
  const hand = drawCards(state, HAND_SIZE, rng)
  state.legislative = {
    presidentHand: hand,
    chancellorHand: [],
    presidentDiscard: null,
    vetoRequested: false,
  }
  state.phase = 'legislativePresident'
}

function chaos(state: GameState, rng: Rng): void {
  state.tracker = 0
  state.lastPresidentId = null
  state.lastChancellorId = null
  const [card] = drawCards(state, 1, rng)
  enactPolicy(state, card)
  if (!checkPolicyVictory(state)) startNextRound(state)
}

function resolveFailedElection(state: GameState, rng: Rng): void {
  state.tracker += 1
  if (state.tracker >= TRACKER_MAX) chaos(state, rng)
  else startNextRound(state)
}

function requirePhase(state: GameState, phase: GameState['phase']): RuleError | null {
  return state.phase === phase ? null : fail('invalidPhase', { phase: state.phase })
}

function requireLivingTarget(state: GameState, playerId: number): RuleError | null {
  const target = playerById(state, playerId)
  if (!target) return fail('invalidPlayer')
  if (!target.alive) return fail('playerEliminated', { name: target.name })
  return null
}

function apply(state: GameState, action: GameAction, rng: Rng): RuleError | null {
  switch (action.type) {
    case 'nextReveal': {
      const phaseError = requirePhase(state, 'roleReveal')
      if (phaseError) return phaseError
      if (state.revealIndex + 1 < state.players.length) {
        state.revealIndex += 1
        return null
      }
      state.phase = 'nomination'
      state.revealIndex = 0
      return null
    }

    case 'nominate': {
      const phaseError = requirePhase(state, 'nomination')
      if (phaseError) return phaseError
      const target = playerById(state, action.playerId)
      if (!target) return fail('invalidPlayer')
      if (target.id === state.presidentId) return fail('selfNomination')
      if (!target.alive) return fail('playerEliminated', { name: target.name })
      const elig = eligibility(state, target.id)
      if (!elig.eligible) return fail('termLimited', { name: target.name, reason: elig.reason })
      state.nomineeId = target.id
      state.phase = 'voting'
      return null
    }

    case 'vote': {
      const phaseError = requirePhase(state, 'voting')
      if (phaseError) return phaseError
      if (state.nomineeId === null) return fail('invalidPlayer')
      const chancellor = playerById(state, state.nomineeId)
      if (!chancellor) return fail('invalidPlayer')
      state.lastElection = {
        presidentId: state.presidentId,
        chancellorId: chancellor.id,
        approved: action.approved,
      }
      if (!action.approved) {
        resolveFailedElection(state, rng)
        return null
      }
      state.lastPresidentId = state.presidentId
      state.lastChancellorId = chancellor.id
      state.tracker = 0
      if (chancellor.role === 'hitler' && state.enactedFascist >= 3) {
        setGameOver(state, { winners: ['fascist'], reason: 'hitlerElected' })
        return null
      }
      beginLegislative(state, rng)
      return null
    }

    case 'presidentDiscard': {
      const phaseError = requirePhase(state, 'legislativePresident')
      if (phaseError) return phaseError
      const leg = state.legislative
      if (!leg || leg.presidentHand.length !== HAND_SIZE) return fail('invalidPhase')
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= HAND_SIZE) {
        return fail('invalidIndex')
      }
      const hand = [...leg.presidentHand]
      const [card] = hand.splice(action.index, 1)
      leg.presidentDiscard = card
      leg.presidentHand = []
      leg.chancellorHand = hand
      state.phase = 'legislativeChancellor'
      return null
    }

    case 'chancellorEnact': {
      const phaseError = requirePhase(state, 'legislativeChancellor')
      if (phaseError) return phaseError
      const leg = state.legislative
      if (!leg || leg.chancellorHand.length !== 2 || !leg.presidentDiscard) {
        return fail('invalidPhase')
      }
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= 2) {
        return fail('invalidIndex')
      }
      const hand = [...leg.chancellorHand]
      const [card] = hand.splice(action.index, 1)
      const other = hand[0]
      state.discard.push(leg.presidentDiscard, other)
      enactPolicy(state, card)
      state.legislative = null
      if (checkPolicyVictory(state)) return null

      if (card === 'communist') {
        const power = communistPowerFor(state.playerCount, state.enactedCommunist)
        if (power === 'fiveYearPlan') {
          state.deck = growDeckForFiveYearPlan(state.deck, rng)
        }
        if (power !== 'none') {
          state.pendingAction = { type: power, actorId: state.presidentId }
          state.phase = 'communistPower'
          if (power === 'confession') {
            // Snapshot now: a later conversion must not rewrite the public record.
            const president = playerById(state, state.presidentId)!
            state.confession = { playerId: president.id, party: president.party }
          }
          return null
        }
        startNextRound(state)
        return null
      }

      const power = card === 'fascist' ? powerFor(state.playerCount, state.enactedFascist) : 'none'
      if (power !== 'none') {
        state.pendingAction = { type: power, actorId: state.presidentId }
        state.phase = 'executive'
        state.peeked = null
        state.investigation = null
        if (power === 'peek') state.peeked = peekCards(state, 3, rng)
        return null
      }
      startNextRound(state)
      return null
    }

    case 'requestVeto': {
      const phaseError = requirePhase(state, 'legislativeChancellor')
      if (phaseError) return phaseError
      if (!state.vetoUnlocked) return fail('vetoLocked')
      if (!state.legislative) return fail('invalidPhase')
      state.legislative.vetoRequested = true
      return null
    }

    case 'vetoResponse': {
      const phaseError = requirePhase(state, 'legislativeChancellor')
      if (phaseError) return phaseError
      const leg = state.legislative
      if (!leg || !leg.vetoRequested || !leg.presidentDiscard) return fail('noVetoRequest')
      if (!action.accept) {
        leg.vetoRequested = false
        return null
      }
      state.discard.push(...leg.chancellorHand, leg.presidentDiscard)
      state.legislative = null
      state.tracker += 1
      if (state.tracker >= TRACKER_MAX) chaos(state, rng)
      else startNextRound(state)
      return null
    }

    case 'investigate': {
      const phaseError = requirePhase(state, 'executive')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'investigate') return fail('invalidPhase')
      const targetError = requireLivingTarget(state, action.playerId)
      if (targetError) return targetError
      if (state.investigated.includes(action.playerId)) return fail('alreadyInvestigated')
      const target = playerById(state, action.playerId)!
      state.investigated.push(target.id)
      state.investigation = {
        playerId: target.id,
        party: target.party,
      }
      return null
    }

    case 'acknowledgeInvestigation': {
      const phaseError = requirePhase(state, 'executive')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'investigate' || !state.investigation) {
        return fail('invalidPhase')
      }
      state.pendingAction = null
      state.investigation = null
      startNextRound(state)
      return null
    }

    case 'acknowledgePeek': {
      const phaseError = requirePhase(state, 'executive')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'peek' || !state.peeked) return fail('invalidPhase')
      state.pendingAction = null
      state.peeked = null
      startNextRound(state)
      return null
    }

    case 'specialElection': {
      const phaseError = requirePhase(state, 'executive')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'special') return fail('invalidPhase')
      const targetError = requireLivingTarget(state, action.playerId)
      if (targetError) return targetError
      if (action.playerId === state.presidentId) return fail('invalidTarget')
      state.specialReturnId = nextLivingAfter(state, state.presidentId)
      state.presidentId = action.playerId
      state.round += 1
      state.phase = 'nomination'
      state.nomineeId = null
      state.legislative = null
      state.pendingAction = null
      state.peeked = null
      state.investigation = null
      state.radicalisation = null
      state.confession = null
      return null
    }

    case 'execute': {
      const phaseError = requirePhase(state, 'executive')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'execute') return fail('invalidPhase')
      const targetError = requireLivingTarget(state, action.playerId)
      if (targetError) return targetError
      const target = playerById(state, action.playerId)!
      target.alive = false
      state.pendingAction = null
      state.peeked = null
      state.investigation = null
      if (target.role === 'hitler') {
        setGameOver(state, {
          winners: isExpansion(state.playerCount) ? ['liberal', 'communist'] : ['liberal'],
          reason: 'hitlerExecuted',
        })
        return null
      }
      startNextRound(state)
      return null
    }

    case 'radicalise': {
      const phaseError = requirePhase(state, 'communistPower')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'radicalise') return fail('invalidPhase')
      const targetError = requireLivingTarget(state, action.playerId)
      if (targetError) return targetError
      const target = playerById(state, action.playerId)!
      const before = target.party
      const after =
        target.role !== 'hitler' && before !== 'communist' ? ('communist' as const) : before
      target.party = after
      state.radicalisation = { targetId: target.id, before, after, revealIndex: 0 }
      state.pendingAction = null
      state.phase = 'radicalisationReveal'
      return null
    }

    case 'nextRadicalisationReveal': {
      const phaseError = requirePhase(state, 'radicalisationReveal')
      if (phaseError) return phaseError
      if (!state.radicalisation) return fail('invalidPhase')
      const living = livingPlayers(state).length
      if (state.radicalisation.revealIndex >= living) return fail('invalidPhase')
      state.radicalisation.revealIndex = Math.min(state.radicalisation.revealIndex + 1, living)
      return null
    }

    case 'finishRadicalisation': {
      const phaseError = requirePhase(state, 'radicalisationReveal')
      if (phaseError) return phaseError
      if (!state.radicalisation) return fail('invalidPhase')
      if (state.radicalisation.revealIndex < livingPlayers(state).length) {
        return fail('invalidPhase')
      }
      state.radicalisation = null
      state.pendingAction = null
      startNextRound(state)
      return null
    }

    case 'acknowledgeFiveYearPlan': {
      const phaseError = requirePhase(state, 'communistPower')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'fiveYearPlan') return fail('invalidPhase')
      state.pendingAction = null
      startNextRound(state)
      return null
    }

    case 'acknowledgeConfession': {
      const phaseError = requirePhase(state, 'communistPower')
      if (phaseError) return phaseError
      if (state.pendingAction?.type !== 'confession' || !state.confession) {
        return fail('invalidPhase')
      }
      state.confessions.push({
        playerId: state.confession.playerId,
        party: state.confession.party,
        round: state.round,
      })
      state.confession = null
      state.pendingAction = null
      startNextRound(state)
      return null
    }

    default:
      return fail('unknownAction')
  }
}

export function transition(state: GameState, action: GameAction, rng: Rng = secureRng()): ActionResult {
  if (state.phase === 'gameOver' && action.type !== 'nextReveal') {
    return { ok: false, state, error: fail('invalidPhase', { phase: state.phase }) }
  }
  const next = structuredClone(state)
  const error = apply(next, action, rng)
  if (error) return { ok: false, state, error }
  return { ok: true, state: next }
}

export function knowledgeFor(state: GameState, playerId: number): KnowledgeEntry {
  const player = playerById(state, playerId)
  if (!player) {
    return { role: 'liberal', party: 'liberal', fascists: [], hitler: null, communists: [] }
  }
  if (player.role === 'liberal') {
    return { role: 'liberal', party: player.party, fascists: [], hitler: null, communists: [] }
  }
  if (player.role === 'communist') {
    return {
      role: 'communist',
      party: player.party,
      fascists: [],
      hitler: null,
      communists: state.players
        .filter((p) => p.role === 'communist' && p.id !== player.id)
        .map((p) => p.name),
    }
  }

  const fascists = state.players.filter((p) => p.role === 'fascist')
  const hitler = state.players.find((p) => p.role === 'hitler')
  const hitlerName = hitler?.name ?? null

  if (player.role === 'hitler') {
    return {
      role: 'hitler',
      party: player.party,
      fascists: state.playerCount <= 6 ? fascists.map((p) => p.name) : [],
      hitler: null,
      communists: [],
    }
  }
  return {
    role: 'fascist',
    party: player.party,
    fascists: fascists.filter((p) => p.id !== player.id).map((p) => p.name),
    hitler: hitlerName,
    communists: [],
  }
}

export type SecretStep =
  | 'radicalisePick'
  | 'fiveYearPlan'
  | 'confession'
  | 'radicaliseReveal'
  | 'radicaliseDone'
  | null

/** The current pass-the-phone step, derived from persisted state only. */
export function secretStep(state: GameState): SecretStep {
  if (state.phase === 'communistPower') {
    switch (state.pendingAction?.type) {
      case 'radicalise':
        return 'radicalisePick'
      case 'fiveYearPlan':
        return 'fiveYearPlan'
      case 'confession':
        return 'confession'
      default:
        return null
    }
  }
  if (state.phase === 'radicalisationReveal' && state.radicalisation) {
    const living = state.players.filter((p) => p.alive).length
    return state.radicalisation.revealIndex >= living ? 'radicaliseDone' : 'radicaliseReveal'
  }
  return null
}

export function selectPublicView(state: GameState): PublicView {
  return {
    schemaVersion: state.schemaVersion,
    expansion: state.expansion,
    id: state.id,
    playerCount: state.playerCount,
    players: state.players.map((p) => ({ id: p.id, name: p.name, alive: p.alive })),
    phase: state.phase,
    presidentId: state.presidentId,
    nomineeId: state.nomineeId,
    lastElection: state.lastElection ? { ...state.lastElection } : null,
    lastPresidentId: state.lastPresidentId,
    lastChancellorId: state.lastChancellorId,
    enactedLiberal: state.enactedLiberal,
    enactedFascist: state.enactedFascist,
    ...(isExpansion(state.playerCount)
      ? {
          enactedCommunist: state.enactedCommunist,
          confessions: state.confessions.map((confession) => ({ ...confession })),
        }
      : {}),
    deckCount: state.deck.length,
    discardCount: state.discard.length,
    tracker: state.tracker,
    round: state.round,
    vetoUnlocked: state.vetoUnlocked,
    investigated: [...state.investigated],
    pendingActionType: state.pendingAction?.type ?? null,
    gameOver: state.gameOver
      ? { winners: [...state.gameOver.winners], reason: state.gameOver.reason }
      : null,
  }
}
