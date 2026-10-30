import { describe, expect, it } from 'vitest'
import {
  BOARD_POWERS,
  DECK_TOTAL,
  ROLE_TABLE,
  SMALL_FASCIST_TRACK,
  SMALL_LIBERAL_TRACK,
  fascistTrackFor,
  isSmallTable,
  liberalTrackFor,
  powerFor,
} from './constants'
import { makeDeck } from './deck'
import { createGame, eligibility, knowledgeFor, selectPublicView, transition, validateSetup } from './engine'
import { seededRng } from './rng'
import { parseSave } from '../stores/game'
import type { GameAction, GameState, Policy } from './types'

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`)

function created(count: number, seed = 7): GameState {
  const result = createGame({ playerCount: count, names: names(count) }, seededRng(seed))
  if (!result.ok) throw new Error(result.error.code)
  return result.state
}

function ok(result: ReturnType<typeof transition>): GameState {
  if (!result.ok) throw new Error(`unexpected ${result.error.code}`)
  return result.state
}

function act(state: GameState, action: GameAction, seed = 11): GameState {
  return ok(transition(state, action, seededRng(seed)))
}

function revealed(count: number, seed = 7): GameState {
  let state = created(count, seed)
  while (state.phase === 'roleReveal') state = act(state, { type: 'nextReveal' }, 3)
  return state
}

function legislative(
  state: GameState,
  counts: { liberal?: number; fascist?: number },
  chancellorHand: [Policy, Policy],
): GameState {
  return {
    ...state,
    enactedLiberal: counts.liberal ?? 0,
    enactedFascist: counts.fascist ?? 0,
    phase: 'legislativeChancellor',
    legislative: {
      presidentHand: [],
      chancellorHand,
      presidentDiscard: 'liberal',
      vetoRequested: false,
    },
  }
}

describe('4-player house variant', () => {
  it('adds the 4-player role row and leaves 5+ alone', () => {
    expect(ROLE_TABLE[4]).toEqual({ liberal: 2, fascist: 1, hitler: 1 })
    expect(SMALL_LIBERAL_TRACK).toBe(4)
    expect(SMALL_FASCIST_TRACK).toBe(5)
    expect(isSmallTable(4)).toBe(true)
    expect(isSmallTable(5)).toBe(false)
    expect(liberalTrackFor(4)).toBe(4)
    expect(fascistTrackFor(4)).toBe(5)
    expect(liberalTrackFor(5)).toBe(5)
    expect(fascistTrackFor(10)).toBe(6)
    expect(liberalTrackFor(13)).toBe(5)
  })

  it('accepts 4 players and rejects 3', () => {
    expect(validateSetup({ playerCount: 4, names: names(4) })).toBeNull()
    expect(validateSetup({ playerCount: 3, names: names(3) })?.code).toBe('invalidPlayerCount')
    const state = created(4)
    expect(state.players.map((player) => player.role).sort()).toEqual([
      'fascist',
      'hitler',
      'liberal',
      'liberal',
    ])
    expect(state.expansion).toBeNull()
  })

  it('deals exactly 2 liberals, 1 fascist and Hitler across seeds', () => {
    for (let run = 0; run < 1_000; run++) {
      const roles = created(4, run).players.map((player) => player.role)
      expect(roles.filter((role) => role === 'liberal')).toHaveLength(2)
      expect(roles.filter((role) => role === 'fascist')).toHaveLength(1)
      expect(roles.filter((role) => role === 'hitler')).toHaveLength(1)
    }
  })

  it('keeps the 17-tile deck and the 5-6 knowledge rule', () => {
    const state = revealed(4)
    expect(makeDeck(4)).toHaveLength(DECK_TOTAL)
    expect(makeDeck(4)).not.toContain('communist')
    const fascist = state.players.find((player) => player.role === 'fascist')!
    const hitler = state.players.find((player) => player.role === 'hitler')!
    expect(knowledgeFor(state, fascist.id).hitler).toBe(hitler.name)
    expect(knowledgeFor(state, hitler.id).fascists).toEqual([fascist.name])
    expect('enactedCommunist' in selectPublicView(state)).toBe(false)
  })

  it('uses a 4-power board with no investigation and no sixth space', () => {
    expect(BOARD_POWERS[4]).toEqual(['none', 'none', 'peek', 'execute'])
    expect(powerFor(4, 1)).toBe('none')
    expect(powerFor(4, 2)).toBe('none')
    expect(powerFor(4, 3)).toBe('peek')
    expect(powerFor(4, 4)).toBe('execute')
    expect(powerFor(4, 5)).toBe('none')
    for (let space = 1; space <= 5; space++) {
      expect(powerFor(4, space)).not.toBe('investigate')
    }
  })

  it('ends the game at 4 liberal or 5 fascist policies', () => {
    const liberal = act(legislative(revealed(4), { liberal: 3 }, ['liberal', 'fascist']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(liberal.gameOver).toMatchObject({ winners: ['liberal'], reason: 'liberalPolicies' })
    expect(liberal.pendingAction).toBeNull()

    const fascist = act(legislative(revealed(4), { fascist: 4 }, ['fascist', 'liberal']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(fascist.gameOver).toMatchObject({ winners: ['fascist'], reason: 'fascistPolicies' })
    expect(fascist.pendingAction).toBeNull()
  })

  it('does not end at 3 liberal policies', () => {
    const state = act(legislative(revealed(4), { liberal: 2 }, ['liberal', 'fascist']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(state.enactedLiberal).toBe(3)
    expect(state.gameOver).toBeNull()
    expect(state.phase).toBe('nomination')
  })

  it('does not end at 4 fascist policies and offers the execution power instead', () => {
    const state = act(legislative(revealed(4), { fascist: 3 }, ['fascist', 'liberal']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(state.gameOver).toBeNull()
    expect(state.phase).toBe('executive')
    expect(state.pendingAction?.type).toBe('execute')
  })

  it('lets the last president be nominated so 3 survivors cannot deadlock', () => {
    let state = revealed(4)
    state = { ...state, lastPresidentId: null, lastChancellorId: null }
    const president = state.presidentId
    const target = state.players.find(
      (player) => player.id !== president && player.role !== 'hitler',
    )!.id
    state = act(
      {
        ...state,
        phase: 'executive',
        pendingAction: { type: 'execute', actorId: president },
      },
      { type: 'execute', playerId: target },
    )
    expect(state.players.filter((player) => player.alive)).toHaveLength(3)

    const survivors = state.players.filter((player) => player.alive)
    const others = survivors.filter((player) => player.id !== state.presidentId)
    // Worst case: one survivor was the last chancellor, the other the last president.
    state = { ...state, lastChancellorId: others[0].id, lastPresidentId: others[1].id }
    expect(eligibility(state, others[0].id)).toMatchObject({ eligible: false, reason: 'termChancellor' })
    expect(eligibility(state, others[1].id)).toMatchObject({ eligible: true, reason: 'ok' })
    state = act(state, { type: 'nominate', playerId: others[1].id })
    expect(state.phase).toBe('voting')
  })

  it('validates a 4-player save against the shorter tracks', () => {
    const state = revealed(4)
    const parsed = parseSave(JSON.stringify(state))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.players).toHaveLength(4)

    const full = parseSave(JSON.stringify({ ...state, enactedLiberal: 4 }))
    expect(full).toEqual({ error: 'corrupt' })
    const fascistFull = parseSave(JSON.stringify({ ...state, enactedFascist: 5 }))
    expect(fascistFull).toEqual({ error: 'corrupt' })
  })
})
