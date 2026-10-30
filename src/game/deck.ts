import { deckRecipeFor } from './constants'
import { shuffle, type Rng } from './rng'
import type { Policy } from './types'

export interface DeckState {
  deck: Policy[]
  discard: Policy[]
}

export function makeDeck(playerCount: number): Policy[] {
  const recipe = deckRecipeFor(playerCount)
  return [
    ...Array<Policy>(recipe.liberal).fill('liberal'),
    ...Array<Policy>(recipe.fascist).fill('fascist'),
    ...Array<Policy>(recipe.communist).fill('communist'),
  ]
}

/** AC-11: add exactly 2 Communist + 1 Liberal to the draw deck and shuffle it. */
export function growDeckForFiveYearPlan(deck: Policy[], rng: Rng): Policy[] {
  return shuffle([...deck, 'communist', 'communist', 'liberal'], rng)
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
