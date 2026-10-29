import type { Power, Role } from './types'

export const MIN_PLAYERS = 5
export const MAX_PLAYERS = 10
export const LIBERAL_TRACK = 5
export const FASCIST_TRACK = 6
export const TRACKER_MAX = 3
export const DECK_LIBERAL = 6
export const DECK_FASCIST = 11
export const DECK_TOTAL = DECK_LIBERAL + DECK_FASCIST
export const HAND_SIZE = 3

export const ROLE_TABLE: Record<number, { liberal: number; fascist: number; hitler: 1 }> = {
  5: { liberal: 3, fascist: 1, hitler: 1 },
  6: { liberal: 4, fascist: 1, hitler: 1 },
  7: { liberal: 4, fascist: 2, hitler: 1 },
  8: { liberal: 5, fascist: 2, hitler: 1 },
  9: { liberal: 5, fascist: 3, hitler: 1 },
  10: { liberal: 6, fascist: 3, hitler: 1 },
}

/**
 * Executive power on each fascist policy space (1-based). The sixth space is
 * the fascist victory and never has a power. Standard Edition boards.
 */
export const BOARD_POWERS: Record<number, Power[]> = {
  5: ['none', 'none', 'peek', 'execute', 'execute'],
  6: ['none', 'none', 'peek', 'execute', 'execute'],
  7: ['none', 'investigate', 'special', 'execute', 'execute'],
  8: ['none', 'investigate', 'special', 'execute', 'execute'],
  9: ['investigate', 'investigate', 'special', 'execute', 'execute'],
  10: ['investigate', 'investigate', 'special', 'execute', 'execute'],
}

export function roleCounts(playerCount: number): { liberal: number; fascist: number; hitler: 1 } | null {
  return ROLE_TABLE[playerCount] ?? null
}

export function powerFor(playerCount: number, fascistPolicy: number): Power {
  if (fascistPolicy < 1 || fascistPolicy >= FASCIST_TRACK) return 'none'
  return BOARD_POWERS[playerCount]?.[fascistPolicy - 1] ?? 'none'
}

export function rolesFor(playerCount: number): Role[] | null {
  const counts = roleCounts(playerCount)
  if (!counts) return null
  return [
    ...Array<Role>(counts.liberal).fill('liberal'),
    ...Array<Role>(counts.fascist).fill('fascist'),
    'hitler',
  ]
}
