import { DECK_FASCIST, DECK_LIBERAL } from './constants'
import { shuffle, type Rng } from './rng'
import type { Policy } from './types'

export interface DeckState {
  deck: Policy[]
  discard: Policy[]
}

export function makeDeck(): Policy[] {
  return [
    ...Array<Policy>(DECK_LIBERAL).fill('liberal'),
    ...Array<Policy>(DECK_FASCIST).fill('fascist'),
  ]
}

/**
 * Draw from the top (index 0). Whenever fewer than `count` tiles remain, the
 * deck and discard pile are shuffled together first (official rule).
 */
export function drawCards(state: DeckState, count: number, rng: Rng): Policy[] {
  if (state.deck.length + state.discard.length < count) {
    throw new Error('not enough policy tiles')
  }
  if (state.deck.length < count) {
    state.deck = shuffle([...state.deck, ...state.discard], rng)
    state.discard = []
  }
  return state.deck.splice(0, count)
}

/** Look at the top `count` tiles without removing them. Reshuffles if needed. */
export function peekCards(state: DeckState, count: number, rng: Rng): Policy[] {
  if (state.deck.length < count) {
    state.deck = shuffle([...state.deck, ...state.discard], rng)
    state.discard = []
  }
  return state.deck.slice(0, count)
}
