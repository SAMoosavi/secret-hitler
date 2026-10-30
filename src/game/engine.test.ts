import { describe, expect, it } from 'vitest'
import { BOARD_POWERS, DECK_TOTAL, ROLE_TABLE, powerFor, rolesFor } from './constants'
import { drawCards, makeDeck } from './deck'
import {
  createGame,
  eligibility,
  knowledgeFor,
  selectPublicView,
  transition,
  validateSetup,
} from './engine'
import { seededRng } from './rng'
import type { GameAction, GameState, Policy } from './types'

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`)

function base(count = 5, seed = 7): GameState {
  const result = createGame({ playerCount: count, names: names(count) }, seededRng(seed))
  if (!result.ok) throw new Error(result.error.code)
  return result.state
}

function revealed(count = 5, seed = 7): GameState {
  let state = base(count, seed)
  while (state.phase === 'roleReveal') state = ok(transition(state, { type: 'nextReveal' }, seededRng(3)))
  return state
}

function ok(result: ReturnType<typeof transition>): GameState {
  if (!result.ok) throw new Error(`unexpected ${result.error.code}`)
  return result.state
}

function act(state: GameState, action: GameAction, seed = 11): GameState {
  return ok(transition(state, action, seededRng(seed)))
}

function idOf(state: GameState, role: 'liberal' | 'fascist' | 'hitler'): number {
  const player = state.players.find((p) => p.role === role)
  if (!player) throw new Error(`no ${role}`)
  return player.id
}

function nextEligible(state: GameState): number {
  const id = state.players.find((p) => eligibility(state, p.id).eligible)?.id
  if (id === undefined) throw new Error('no eligible chancellor')
  return id
}

function totalTiles(state: GameState): number {
  const inHand = state.legislative
    ? state.legislative.presidentHand.length + state.legislative.chancellorHand.length
    : 0
  return state.deck.length + state.discard.length + state.enactedLiberal + state.enactedFascist + inHand
}

describe('role table and setup', () => {
  it('encodes the official 5-10 and expansion 11-13 distributions', () => {
    expect(ROLE_TABLE).toEqual({
      5: { liberal: 3, fascist: 1, hitler: 1 },
      6: { liberal: 4, fascist: 1, hitler: 1 },
      7: { liberal: 4, fascist: 2, hitler: 1 },
      8: { liberal: 5, fascist: 2, hitler: 1 },
      9: { liberal: 5, fascist: 3, hitler: 1 },
      10: { liberal: 6, fascist: 3, hitler: 1 },
      11: { liberal: 5, fascist: 3, communist: 2, hitler: 1 },
      12: { liberal: 6, fascist: 3, communist: 2, hitler: 1 },
      13: { liberal: 6, fascist: 3, communist: 3, hitler: 1 },
    })
    for (const count of [4, 14, 5.5]) {
      expect(rolesFor(count as number)).toBeNull()
    }
  })

  it('rejects invalid player counts and duplicate names', () => {
    expect(validateSetup({ playerCount: 4, names: names(4) })?.code).toBe('invalidPlayerCount')
    expect(validateSetup({ playerCount: 14, names: names(14) })?.code).toBe('invalidPlayerCount')
    expect(
      validateSetup({ playerCount: 5, names: ['Sam', 'sam', 'A', 'B', 'C'] })?.code,
    ).toBe('duplicateNames')
    expect(validateSetup({ playerCount: 5, names: [] })?.code).toBe('invalidPlayerCount')
    expect(validateSetup({ playerCount: 5, names: names(5) })).toBeNull()
  })

  it('defaults empty names and trims duplicates', () => {
    const result = createGame(
      { playerCount: 5, names: ['  ', 'Sam', ' Sam ', 'A', 'B'] },
      seededRng(1),
    )
    expect(result.ok).toBe(false)
    const good = createGame({ playerCount: 5, names: ['', 'Sam', 'A', 'B', 'C'] }, seededRng(1))
    if (!good.ok) throw new Error(good.error.code)
    expect(good.state.players[0].name).toBe('Player 1')
  })

  it('assigns exactly one valid role per player across 10,000 runs per count', () => {
    for (let count = 5; count <= 10; count++) {
      const expected = ROLE_TABLE[count]
      for (let run = 0; run < 10_000; run++) {
        const result = createGame({ playerCount: count, names: names(count) }, seededRng(run + count * 100_000))
        if (!result.ok) throw new Error(result.error.code)
        const roles = result.state.players.map((p) => p.role)
        expect(roles).toHaveLength(count)
        expect(roles.filter((r) => r === 'liberal')).toHaveLength(expected.liberal)
        expect(roles.filter((r) => r === 'fascist')).toHaveLength(expected.fascist)
        expect(roles.filter((r) => r === 'hitler')).toHaveLength(1)
      }
    }
  }, 120_000)

  it('never exposes roles or deck order in the public view', () => {
    const state = revealed()
    const view = selectPublicView(state)
    expect(JSON.stringify(view)).not.toContain('"role"')
    expect('deck' in view).toBe(false)
    expect('discard' in view).toBe(false)
    expect('legislative' in view).toBe(false)
    expect(view.players.every((p) => !('role' in p))).toBe(true)
  })
})

describe('nomination and term limits', () => {
  it('rejects self, dead, and term-limited nominations without changing state', () => {
    let state = revealed(7)
    const president = state.presidentId
    const other = state.players.find((p) => p.id !== president)!.id
    const before = structuredClone(state)

    const self = transition(state, { type: 'nominate', playerId: president }, seededRng(1))
    expect(self.ok).toBe(false)
    if (!self.ok) expect(self.error.code).toBe('selfNomination')
    expect(self.state).toBe(state)

    state = { ...state, lastPresidentId: other }
    const limited = transition(state, { type: 'nominate', playerId: other }, seededRng(1))
    expect(limited.ok).toBe(false)
    if (!limited.ok) expect(limited.error.code).toBe('termLimited')

    const deadState = structuredClone(before)
    deadState.players[other].alive = false
    const dead = transition(deadState, { type: 'nominate', playerId: other }, seededRng(1))
    expect(dead.ok).toBe(false)
    if (!dead.ok) expect(dead.error.code).toBe('playerEliminated')
  })

  it('allows the last president but not the last chancellor when exactly 5 live', () => {
    const state = revealed()
    const president = state.presidentId
    const others = state.players.filter((p) => p.id !== president)
    const lastPresident = others[0].id
    const lastChancellor = others[1].id
    const five = {
      ...state,
      lastPresidentId: lastPresident,
      lastChancellorId: lastChancellor,
    }
    expect(eligibility(five, lastPresident)).toMatchObject({ eligible: true, reason: 'ok' })
    expect(eligibility(five, lastChancellor)).toMatchObject({
      eligible: false,
      reason: 'termChancellor',
    })

    const four = structuredClone(five)
    four.players[others[2].id].alive = false
    expect(eligibility(four, lastPresident)).toMatchObject({
      eligible: false,
      reason: 'termPresident',
    })
  })
})

describe('elections, tracker, and chaos', () => {
  it('approves a government and deals a three-card hand', () => {
    let state = revealed()
    const chancellor = nextEligible(state)
    state = act(state, { type: 'nominate', playerId: chancellor })
    state = act(state, { type: 'vote', approved: true })
    expect(state.phase).toBe('legislativePresident')
    expect(state.legislative?.presidentHand).toHaveLength(3)
    expect(state.lastPresidentId).not.toBeNull()
    expect(state.lastChancellorId).toBe(chancellor)
    expect(state.tracker).toBe(0)
    expect(totalTiles(state)).toBe(DECK_TOTAL)
  })

  it('rejects a government, advances the tracker and presidency', () => {
    let state = revealed()
    const firstPresident = state.presidentId
    state = act(state, { type: 'nominate', playerId: nextEligible(state) })
    state = act(state, { type: 'vote', approved: false })
    expect(state.phase).toBe('nomination')
    expect(state.tracker).toBe(1)
    expect(state.lastElection?.approved).toBe(false)
    expect(state.presidentId).not.toBe(firstPresident)
  })

  it('enacts the top policy after the third rejection, ignoring its power, and clears terms', () => {
    let state = revealed()
    // Pretend a previous government is term-limited, then fail three votes.
    state = { ...state, lastPresidentId: null, lastChancellorId: null, tracker: 2 }
    const trackerBefore = state.tracker
    state = act(state, { type: 'nominate', playerId: nextEligible(state) })
    state = act(state, { type: 'vote', approved: false })
    expect(trackerBefore).toBe(2)
    expect(state.tracker).toBe(0)
    expect(state.phase).toBe('nomination')
    expect(state.enactedLiberal + state.enactedFascist).toBe(1)
    expect(state.lastPresidentId).toBeNull()
    expect(state.lastChancellorId).toBeNull()
    expect(state.pendingAction).toBeNull()
    expect(state.deck.length + state.discard.length).toBe(16)
    expect(totalTiles(state)).toBe(DECK_TOTAL)
  })

  it('clears existing term limits when chaos fires', () => {
    let state = revealed()
    const others = state.players.filter((p) => p.id !== state.presidentId)
    state = {
      ...state,
      tracker: 2,
      lastPresidentId: others[0].id,
      lastChancellorId: others[1].id,
    }
    state = act(state, { type: 'nominate', playerId: nextEligible(state) })
    const lastPresident = state.lastPresidentId
    state = act(state, { type: 'vote', approved: false })
    expect(lastPresident).not.toBeNull()
    expect(state.lastPresidentId).toBeNull()
    expect(state.lastChancellorId).toBeNull()
  })
})

describe('legislative session and deck arithmetic', () => {
  it('draws 3, discards 1, hands 2, enacts 1 and never leaks the third card', () => {
    let state = revealed()
    const deckBefore = state.deck.length
    state = act(state, { type: 'nominate', playerId: nextEligible(state) })
    state = act(state, { type: 'vote', approved: true })
    const hand = [...state.legislative!.presidentHand]
    state = act(state, { type: 'presidentDiscard', index: 0 })
    expect(state.phase).toBe('legislativeChancellor')
    expect(state.legislative!.presidentHand).toEqual([])
    expect(state.legislative!.chancellorHand).toEqual([hand[1], hand[2]])
    expect(state.legislative!.presidentDiscard).toBe(hand[0])
    expect(selectPublicView(state)).not.toHaveProperty('legislative')
    state = act(state, { type: 'chancellorEnact', index: 0 })
    expect(state.enactedLiberal + state.enactedFascist).toBe(1)
    expect(state.discard).toEqual([hand[0], hand[2]])
    expect(state.deck.length).toBe(deckBefore - 3)
    expect(totalTiles(state)).toBe(DECK_TOTAL)
  })

  it('reshuffles the discard pile when fewer than three tiles remain', () => {
    const state = { deck: ['liberal'] as Policy[], discard: Array<Policy>(16).fill('fascist') }
    const drawn = drawCards(state, 3, seededRng(4))
    expect(drawn).toHaveLength(3)
    expect(state.deck.length + state.discard.length).toBe(14)
    expect(state.deck.length + state.discard.length + 3).toBe(17)
  })
})

describe('policy powers', () => {
  it('exposes the official power for each count and space', () => {
    expect(BOARD_POWERS[5]).toEqual(['none', 'none', 'peek', 'execute', 'execute'])
    expect(BOARD_POWERS[7]).toEqual(['none', 'investigate', 'special', 'execute', 'execute'])
    expect(BOARD_POWERS[9]).toEqual(['investigate', 'investigate', 'special', 'execute', 'execute'])
    expect(powerFor(5, 6)).toBe('none')
    expect(powerFor(7, 2)).toBe('investigate')
  })

  it('dispatches base powers from fascist cards and none from liberal cards', () => {
    const state = revealed(7)
    const fascist = {
      ...state,
      enactedFascist: 1,
      phase: 'legislativeChancellor' as const,
      legislative: {
        presidentHand: [],
        chancellorHand: ['fascist', 'liberal'] as Policy[],
        presidentDiscard: 'liberal' as Policy,
        vetoRequested: false,
      },
    }
    const withPower = act(fascist, { type: 'chancellorEnact', index: 0 })
    expect(withPower.pendingAction).toEqual({ type: 'investigate', actorId: state.presidentId })
    expect(withPower.phase).toBe('executive')

    const withoutPower = act(
      {
        ...fascist,
        enactedFascist: 0,
        legislative: {
          ...fascist.legislative,
          chancellorHand: ['liberal', 'fascist'] as Policy[],
        },
      },
      { type: 'chancellorEnact', index: 0 },
    )
    expect(withoutPower.pendingAction).toBeNull()
    expect(withoutPower.phase).toBe('nomination')
    expect(withoutPower.enactedLiberal).toBe(1)
    expect(withoutPower.enactedCommunist).toBe(0)
  })

  it('investigates party membership once, never the role', () => {
    let state = revealed()
    const president = state.presidentId
    const fascist = idOf(state, 'fascist')
    state = {
      ...state,
      phase: 'executive',
      pendingAction: { type: 'investigate', actorId: president },
      enactedFascist: 1,
    }
    state = act(state, { type: 'investigate', playerId: fascist })
    expect(state.investigation).toEqual({ playerId: fascist, party: 'fascist' })
    expect(state.phase).toBe('executive')
    const second = transition(state, { type: 'investigate', playerId: fascist }, seededRng(1))
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error.code).toBe('alreadyInvestigated')
    state = act(state, { type: 'acknowledgeInvestigation' })
    expect(state.phase).toBe('nomination')
    expect(state.investigation).toBeNull()
  })

  it('peeks at the top three without changing their order', () => {
    let state = revealed()
    state = {
      ...state,
      enactedFascist: 2,
      phase: 'legislativeChancellor',
      legislative: {
        presidentHand: ['fascist'],
        chancellorHand: ['fascist', 'liberal'],
        presidentDiscard: 'liberal',
        vetoRequested: false,
      },
    }
    const top = state.deck.slice(0, 3)
    state = act(state, { type: 'chancellorEnact', index: 0 })
    expect(state.phase).toBe('executive')
    expect(state.pendingAction?.type).toBe('peek')
    expect(state.peeked).toEqual(top)
    expect(state.deck.slice(0, 3)).toEqual(top)
    state = act(state, { type: 'acknowledgePeek' })
    expect(state.phase).toBe('nomination')
  })

  it('executes a player, ends the game on Hitler, and reveals nothing otherwise', () => {
    let state = revealed(7)
    const hitler = idOf(state, 'hitler')
    const liberal = idOf(state, 'liberal')
    state = {
      ...state,
      phase: 'executive',
      pendingAction: { type: 'execute', actorId: state.presidentId },
    }
    const killed = act(state, { type: 'execute', playerId: liberal })
    expect(killed.players[liberal].alive).toBe(false)
    expect(killed.gameOver).toBeNull()
    expect(killed.phase).toBe('nomination')

    const ended = act(state, { type: 'execute', playerId: hitler })
    expect(ended.gameOver).toEqual({ winners: ['liberal'], reason: 'hitlerExecuted' })
    expect(ended.phase).toBe('gameOver')
  })

  it('calls a special election and resumes normal order after that term', () => {
    let state = revealed()
    const president = state.presidentId
    const others = state.players.filter((p) => p.alive && p.id !== president)
    const target = others[1].id
    const expectedReturn = state.players[(president + 1) % state.players.length].id
    state = {
      ...state,
      phase: 'executive',
      pendingAction: { type: 'special', actorId: president },
    }
    state = act(state, { type: 'specialElection', playerId: target })
    expect(state.presidentId).toBe(target)
    expect(state.specialReturnId).toBe(expectedReturn)
    expect(state.phase).toBe('nomination')

    // The special president's government is rejected; play resumes after the caller.
    state = act(state, { type: 'nominate', playerId: nextEligible(state) })
    state = act(state, { type: 'vote', approved: false })
    expect(state.presidentId).toBe(expectedReturn)
    expect(state.specialReturnId).toBeNull()
  })
})

describe('veto', () => {
  function vetoState(): GameState {
    const state = revealed()
    return {
      ...state,
      enactedFascist: 5,
      vetoUnlocked: true,
      phase: 'legislativeChancellor',
      legislative: {
        presidentHand: ['fascist', 'liberal'],
        chancellorHand: ['fascist', 'liberal'],
        presidentDiscard: 'fascist',
        vetoRequested: false,
      },
    }
  }

  it('is locked before the fifth fascist policy', () => {
    const state = { ...vetoState(), vetoUnlocked: false }
    const result = transition(state, { type: 'requestVeto' }, seededRng(1))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.code).toBe('vetoLocked')
  })

  it('refuses without discarding, and accepts by discarding both and advancing the tracker', () => {
    let state = act(vetoState(), { type: 'requestVeto' })
    expect(state.legislative?.vetoRequested).toBe(true)
    state = act(state, { type: 'vetoResponse', accept: false })
    expect(state.legislative?.vetoRequested).toBe(false)
    expect(state.phase).toBe('legislativeChancellor')
    expect(state.discard).toHaveLength(0)

    state = act(state, { type: 'requestVeto' })
    state = act(state, { type: 'vetoResponse', accept: true })
    expect(state.discard).toHaveLength(3)
    expect(state.tracker).toBe(1)
    expect(state.phase).toBe('nomination')
  })

  it('can trigger chaos when the veto advances the third rejection', () => {
    let state = { ...vetoState(), tracker: 2 }
    state = act(state, { type: 'requestVeto' })
    state = act(state, { type: 'vetoResponse', accept: true })
    expect(state.tracker).toBe(0)
    expect(state.enactedLiberal + state.enactedFascist).toBe(6)
    expect(state.phase).toBe('gameOver')
    expect(state.gameOver?.reason).toBe('fascistPolicies')
  })
})

describe('victory conditions', () => {
  function legislative(enactedLiberal: number, enactedFascist: number, cards: Policy[]): GameState {
    const state = revealed()
    return {
      ...state,
      enactedLiberal,
      enactedFascist,
      phase: 'legislativeChancellor',
      legislative: {
        presidentHand: [cards[1]],
        chancellorHand: [cards[0], cards[1]],
        presidentDiscard: cards[2] ?? 'liberal',
        vetoRequested: false,
      },
    }
  }

  it('ends on five liberal policies', () => {
    const state = act(legislative(4, 0, ['liberal', 'fascist', 'fascist']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(state.gameOver).toEqual({ winners: ['liberal'], reason: 'liberalPolicies' })
  })

  it('ends on six fascist policies without resolving the power', () => {
    const state = act(legislative(0, 5, ['fascist', 'liberal', 'liberal']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(state.gameOver).toEqual({ winners: ['fascist'], reason: 'fascistPolicies' })
    expect(state.pendingAction).toBeNull()
  })

  it('ends when Hitler is elected chancellor after three fascist policies', () => {
    let state = revealed()
    const hitler = idOf(state, 'hitler')
    state = {
      ...state,
      enactedFascist: 3,
      phase: 'voting',
      nomineeId: hitler,
    }
    state = act(state, { type: 'vote', approved: true })
    expect(state.gameOver).toEqual({ winners: ['fascist'], reason: 'hitlerElected' })
    expect(state.phase).toBe('gameOver')
  })

  it('allows Hitler to be elected before the third fascist policy', () => {
    let state = revealed()
    const hitler = idOf(state, 'hitler')
    state = { ...state, enactedFascist: 2, phase: 'voting', nomineeId: hitler }
    state = act(state, { type: 'vote', approved: true })
    expect(state.gameOver).toBeNull()
    expect(state.phase).toBe('legislativePresident')
  })
})

describe('knowledge', () => {
  it('makes the lone fascist and Hitler recognise each other at 5-6', () => {
    for (const count of [5, 6]) {
      const state = revealed(count)
      const fascist = state.players.find((p) => p.role === 'fascist')!
      const hitler = state.players.find((p) => p.role === 'hitler')!
      expect(knowledgeFor(state, fascist.id).hitler).toBe(hitler.name)
      expect(knowledgeFor(state, hitler.id).fascists).toEqual([fascist.name])
    }
  })

  it('shows fascists and Hitler to each fascist, and nothing to Hitler at 7+', () => {
    const state = revealed(9)
    const fascists = state.players.filter((p) => p.role === 'fascist')
    const hitler = state.players.find((p) => p.role === 'hitler')!
    for (const fascist of fascists) {
      const knowledge = knowledgeFor(state, fascist.id)
      expect(knowledge.hitler).toBe(hitler.name)
      expect(knowledge.fascists).toEqual(
        fascists.filter((p) => p.id !== fascist.id).map((p) => p.name),
      )
    }
    expect(knowledgeFor(state, hitler.id)).toEqual({
      role: 'hitler',
      party: 'fascist',
      fascists: [],
      hitler: null,
      communists: [],
    })
  })

  it('tells liberals nothing', () => {
    const state = revealed()
    const liberal = state.players.find((p) => p.role === 'liberal')!
    expect(knowledgeFor(state, liberal.id)).toEqual({
      role: 'liberal',
      party: 'liberal',
      fascists: [],
      hitler: null,
      communists: [],
    })
  })
})

describe('invalid transitions', () => {
  it('rejects out-of-phase actions with the same state object', () => {
    const state = base()
    const actions: GameAction[] = [
      { type: 'nominate', playerId: 1 },
      { type: 'vote', approved: true },
      { type: 'chancellorEnact', index: 0 },
      { type: 'execute', playerId: 1 },
    ]
    for (const action of actions) {
      const result = transition(state, action)
      expect(result.ok).toBe(false)
      expect(result.state).toBe(state)
    }
  })

  it('rejects actions after game over', () => {
    const state: GameState = {
      ...revealed(),
      phase: 'gameOver',
      gameOver: { winners: ['liberal'], reason: 'liberalPolicies' },
    }
    const result = transition(state, { type: 'nominate', playerId: 1 })
    expect(result.ok).toBe(false)
    expect(result.state).toBe(state)
  })
})

describe('full game simulation', () => {
  it('plays a 7-player game to a fascist policy victory through the UI-level actions', () => {
    let state = revealed(7, 21)
    // Stack the deck so every session offers a fascist card.
    state = {
      ...state,
      deck: ['fascist', 'fascist', 'fascist', 'liberal', 'liberal', 'fascist', 'fascist', 'fascist', 'fascist', 'liberal', 'liberal', 'liberal', 'liberal', 'fascist', 'fascist', 'fascist', 'fascist'],
    }
    let guard = 0
    while (!state.gameOver && guard++ < 100) {
      if (state.phase === 'nomination') {
        // Never nominate Hitler: this run is about the policy victory path.
        const pick = state.players.find(
          (p) => p.role !== 'hitler' && eligibility(state, p.id).eligible,
        )
        state = act(state, { type: 'nominate', playerId: pick!.id })
      } else if (state.phase === 'voting') {
        state = act(state, { type: 'vote', approved: true })
      } else if (state.phase === 'legislativePresident') {
        // Keep a fascist card if possible.
        const index = state.legislative!.presidentHand.indexOf('fascist')
        state = act(state, { type: 'presidentDiscard', index: index === -1 ? 0 : index === 0 ? 1 : 0 })
      } else if (state.phase === 'legislativeChancellor') {
        const index = state.legislative!.chancellorHand.indexOf('fascist')
        state = act(state, { type: 'chancellorEnact', index: index === -1 ? 0 : index })
      } else if (state.phase === 'executive') {
        const power = state.pendingAction?.type
        if (power === 'peek') {
          state = act(state, { type: 'acknowledgePeek' })
        } else if (power === 'investigate') {
          const target = state.players.find(
            (p) => p.alive && !state.investigated.includes(p.id),
          )!
          state = act(state, { type: 'investigate', playerId: target.id })
          state = act(state, { type: 'acknowledgeInvestigation' })
        } else if (power === 'special') {
          const target = state.players.find(
            (p) => p.alive && p.id !== state.presidentId && p.role !== 'hitler',
          )!
          state = act(state, { type: 'specialElection', playerId: target.id })
        } else if (power === 'execute') {
          const target = state.players.find(
            (p) => p.alive && p.role !== 'hitler' && p.id !== state.presidentId,
          )!
          state = act(state, { type: 'execute', playerId: target.id })
        } else {
          throw new Error(`unexpected power ${power}`)
        }
      } else {
        throw new Error(`unexpected phase ${state.phase}`)
      }
    }
    expect(state.gameOver).toEqual({ winners: ['fascist'], reason: 'fascistPolicies' })
    expect(state.enactedFascist).toBe(6)
  })
})
