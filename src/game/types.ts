export type Role = 'liberal' | 'fascist' | 'hitler' | 'communist'
export type Party = 'liberal' | 'fascist' | 'communist'
export type Policy = 'liberal' | 'fascist' | 'communist'
export type Power =
  | 'none'
  | 'investigate'
  | 'peek'
  | 'special'
  | 'execute'
  | 'radicalise'
  | 'fiveYearPlan'
  | 'confession'

export type Phase =
  | 'roleReveal'
  | 'nomination'
  | 'voting'
  | 'legislativePresident'
  | 'legislativeChancellor'
  | 'executive'
  | 'communistPower'
  | 'radicalisationReveal'
  | 'gameOver'

export type Winner = 'liberal' | 'fascist' | 'communist'
export type WinReason =
  | 'liberalPolicies'
  | 'fascistPolicies'
  | 'communistPolicies'
  | 'hitlerExecuted'
  | 'hitlerElected'

export interface Player {
  id: number
  name: string
  role: Role
  /** Current party; changes permanently on Radicalisation. */
  party: Party
  alive: boolean
}

export interface PublicPlayer {
  id: number
  name: string
  alive: boolean
}

export interface ElectionResult {
  presidentId: number
  chancellorId: number
  approved: boolean
}

export interface Legislative {
  presidentHand: Policy[]
  chancellorHand: Policy[]
  presidentDiscard: Policy | null
  vetoRequested: boolean
}

export interface PendingAction {
  type: Exclude<Power, 'none'>
  actorId: number
}

export interface InvestigationResult {
  playerId: number
  party: Party
}

export interface Confession {
  playerId: number
  party: Party
  round: number
}

export interface Radicalisation {
  targetId: number
  before: Party
  after: Party
  revealIndex: number
}

export interface GameOver {
  winners: Winner[]
  reason: WinReason
}

export interface GameState {
  schemaVersion: 2
  expansion: 'communist' | null
  id: string
  createdAt: number
  playerCount: number
  players: Player[]
  phase: Phase
  presidentId: number
  nomineeId: number | null
  lastElection: ElectionResult | null
  lastPresidentId: number | null
  lastChancellorId: number | null
  enactedLiberal: number
  enactedFascist: number
  enactedCommunist: number
  deck: Policy[]
  discard: Policy[]
  tracker: number
  round: number
  revealIndex: number
  legislative: Legislative | null
  pendingAction: PendingAction | null
  peeked: Policy[] | null
  investigation: InvestigationResult | null
  investigated: number[]
  vetoUnlocked: boolean
  specialReturnId: number | null
  confessions: Confession[]
  radicalisation: Radicalisation | null
  confession: { playerId: number; party: Party } | null
  gameOver: GameOver | null
}

export interface PublicView {
  schemaVersion: 2
  expansion: 'communist' | null
  id: string
  playerCount: number
  players: PublicPlayer[]
  phase: Phase
  presidentId: number
  nomineeId: number | null
  lastElection: ElectionResult | null
  lastPresidentId: number | null
  lastChancellorId: number | null
  enactedLiberal: number
  enactedFascist: number
  /** Only present for the 11-13 Communist expansion. */
  enactedCommunist?: number
  deckCount: number
  discardCount: number
  tracker: number
  round: number
  vetoUnlocked: boolean
  investigated: number[]
  pendingActionType: PendingAction['type'] | null
  /** Public Confession history; only present for the 11-13 expansion. */
  confessions?: Confession[]
  gameOver: GameOver | null
}

export type RuleErrorCode =
  | 'invalidPhase'
  | 'invalidPlayerCount'
  | 'duplicateNames'
  | 'invalidPlayer'
  | 'playerEliminated'
  | 'selfNomination'
  | 'termLimited'
  | 'invalidIndex'
  | 'notPresident'
  | 'notChancellor'
  | 'vetoLocked'
  | 'noVetoRequest'
  | 'alreadyInvestigated'
  | 'invalidTarget'
  | 'notEnoughCards'
  | 'unknownAction'

export interface RuleError {
  code: RuleErrorCode
  params?: Record<string, string | number>
}

export interface SetupInput {
  playerCount: number
  names: string[]
}

export type GameAction =
  | { type: 'nextReveal' }
  | { type: 'nominate'; playerId: number }
  | { type: 'vote'; approved: boolean }
  | { type: 'presidentDiscard'; index: number }
  | { type: 'chancellorEnact'; index: number }
  | { type: 'requestVeto' }
  | { type: 'vetoResponse'; accept: boolean }
  | { type: 'investigate'; playerId: number }
  | { type: 'acknowledgeInvestigation' }
  | { type: 'acknowledgePeek' }
  | { type: 'specialElection'; playerId: number }
  | { type: 'execute'; playerId: number }
  | { type: 'radicalise'; playerId: number }
  | { type: 'nextRadicalisationReveal' }
  | { type: 'finishRadicalisation' }
  | { type: 'acknowledgeConfession' }
  | { type: 'acknowledgeFiveYearPlan' }

export type ActionResult =
  | { ok: true; state: GameState }
  | { ok: false; state: GameState; error: RuleError }

export type EligibilityReason =
  | 'ok'
  | 'dead'
  | 'president'
  | 'termPresident'
  | 'termChancellor'

export interface Eligibility {
  playerId: number
  eligible: boolean
  reason: EligibilityReason
}

export interface KnowledgeEntry {
  role: Role
  party: Party
  /** Player names this player may privately recognise, by relationship. */
  fascists: string[]
  hitler: string | null
  communists: string[]
}
