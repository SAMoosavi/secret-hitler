import type { Party, Power, Role } from './types'

export const MIN_PLAYERS = 4
export const MAX_PLAYERS = 13
/** Fan-made small-table house variant; every other count keeps the official rules. */
export const SMALL_TABLE_MAX = 4
export const EXPANSION_MIN = 11
export const LIBERAL_TRACK = 5
export const FASCIST_TRACK = 6
export const SMALL_LIBERAL_TRACK = 4
export const SMALL_FASCIST_TRACK = 5
export const COMMUNIST_TRACK = 6
export const TRACKER_MAX = 3
export const DECK_LIBERAL = 6
export const DECK_FASCIST = 11
export const DECK_TOTAL = DECK_LIBERAL + DECK_FASCIST
export const DECK_COMMUNIST = 8
export const HAND_SIZE = 3

export interface DeckRecipe {
  liberal: number
  fascist: number
  communist: number
}

export const COMMUNIST_DECK: DeckRecipe = { liberal: 5, fascist: 10, communist: 8 }

export interface RoleCounts {
  liberal: number
  fascist: number
  /** Only present for the 11-13 Communist expansion. */
  communist?: number
  hitler: 1
}

export const ROLE_TABLE: Record<number, RoleCounts> = {
  4: { liberal: 2, fascist: 1, hitler: 1 },
  5: { liberal: 3, fascist: 1, hitler: 1 },
  6: { liberal: 4, fascist: 1, hitler: 1 },
  7: { liberal: 4, fascist: 2, hitler: 1 },
  8: { liberal: 5, fascist: 2, hitler: 1 },
  9: { liberal: 5, fascist: 3, hitler: 1 },
  10: { liberal: 6, fascist: 3, hitler: 1 },
  11: { liberal: 5, fascist: 3, communist: 2, hitler: 1 },
  12: { liberal: 6, fascist: 3, communist: 2, hitler: 1 },
  13: { liberal: 6, fascist: 3, communist: 3, hitler: 1 },
}

/**
 * Executive power on each fascist policy space (1-based). The sixth space is
 * the fascist victory and never has a power. Standard Edition boards.
 */
export const BOARD_POWERS: Record<number, Power[]> = {
  4: ['none', 'none', 'peek', 'execute'],
  5: ['none', 'none', 'peek', 'execute', 'execute'],
  6: ['none', 'none', 'peek', 'execute', 'execute'],
  7: ['none', 'investigate', 'special', 'execute', 'execute'],
  8: ['none', 'investigate', 'special', 'execute', 'execute'],
  9: ['investigate', 'investigate', 'special', 'execute', 'execute'],
  10: ['investigate', 'investigate', 'special', 'execute', 'execute'],
}

/**
 * Communist track powers for spaces 1-6, read as `[enactedCommunist - 1]`.
 * Space 6 is the Communist victory.
 */
export const COMMUNIST_POWERS: Record<11 | 12 | 13, Power[]> = {
  11: ['none', 'radicalise', 'fiveYearPlan', 'radicalise', 'confession', 'none'],
  12: ['none', 'radicalise', 'fiveYearPlan', 'radicalise', 'confession', 'none'],
  13: ['none', 'radicalise', 'fiveYearPlan', 'radicalise', 'confession', 'none'],
}

export function isExpansion(playerCount: number): boolean {
  return playerCount >= EXPANSION_MIN && playerCount <= MAX_PLAYERS
}

export function isSmallTable(playerCount: number): boolean {
  return playerCount >= MIN_PLAYERS && playerCount <= SMALL_TABLE_MAX
}

export function liberalTrackFor(playerCount: number): number {
  return isSmallTable(playerCount) ? SMALL_LIBERAL_TRACK : LIBERAL_TRACK
}

export function fascistTrackFor(playerCount: number): number {
  return isSmallTable(playerCount) ? SMALL_FASCIST_TRACK : FASCIST_TRACK
}

export function partyForRole(role: Role): Party {
  if (role === 'liberal') return 'liberal'
  if (role === 'communist') return 'communist'
  return 'fascist'
}

export function roleCounts(playerCount: number): RoleCounts | null {
  return ROLE_TABLE[playerCount] ?? null
}

export function deckRecipeFor(playerCount: number): DeckRecipe {
  return isExpansion(playerCount)
    ? { ...COMMUNIST_DECK }
    : { liberal: DECK_LIBERAL, fascist: DECK_FASCIST, communist: 0 }
}

export function powerFor(playerCount: number, fascistPolicy: number): Power {
  if (fascistPolicy < 1 || fascistPolicy >= fascistTrackFor(playerCount)) return 'none'
  return BOARD_POWERS[Math.min(playerCount, 10)]?.[fascistPolicy - 1] ?? 'none'
}

export function communistPowerFor(playerCount: number, communistPolicy: number): Power {
  if (!isExpansion(playerCount) || communistPolicy < 1 || communistPolicy > COMMUNIST_TRACK) {
    return 'none'
  }
  return COMMUNIST_POWERS[playerCount as 11 | 12 | 13]?.[communistPolicy - 1] ?? 'none'
}

export function rolesFor(playerCount: number): Role[] | null {
  const counts = roleCounts(playerCount)
  if (!counts) return null
  return [
    ...Array<Role>(counts.liberal).fill('liberal'),
    ...Array<Role>(counts.fascist).fill('fascist'),
    ...Array<Role>(counts.communist ?? 0).fill('communist'),
    'hitler',
  ]
}
