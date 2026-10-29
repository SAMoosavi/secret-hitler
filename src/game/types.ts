export type Role = 'liberal' | 'fascist' | 'hitler'
export type Party = 'liberal' | 'fascist'
export type Policy = 'liberal' | 'fascist'
export type Power = 'none' | 'investigate' | 'peek' | 'special' | 'execute'

export type Phase =
  | 'roleReveal'
  | 'nomination'
  | 'voting'
  | 'legislativePresident'
  | 'legislativeChancellor'
  | 'executive'
  | 'gameOver'

export type Winner = 'liberal' | 'fascist'
export type WinReason =
  | 'liberalPolicies'
  | 'fascistPolicies'
  | 'hitlerExecuted'
  | 'hitlerElected'

export interface Player {
  id: number
  name: string
  role: Role
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

export interface GameOver {
  winner: Winner
  reason: WinReason
}

export interface GameState {
  schemaVersion: 1
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
  gameOver: GameOver | null
}

export interface PublicView {
  schemaVersion: 1
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
  deckCount: number
  discardCount: number
  tracker: number
  round: number
  vetoUnlocked: boolean
  investigated: number[]
  pendingActionType: PendingAction['type'] | null
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
  /** Player names this player may privately recognise, by relationship. */
  fascists: string[]
  hitler: string | null
}
