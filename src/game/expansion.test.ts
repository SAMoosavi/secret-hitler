import { describe, expect, it } from 'vitest'
import {
  BOARD_POWERS,
  COMMUNIST_DECK,
  COMMUNIST_POWERS,
  COMMUNIST_TRACK,
  DECK_COMMUNIST,
  DECK_FASCIST,
  DECK_LIBERAL,
  DECK_TOTAL,
  EXPANSION_MIN,
  FASCIST_TRACK,
  LIBERAL_TRACK,
  MAX_PLAYERS,
  MIN_PLAYERS,
  ROLE_TABLE,
  communistPowerFor,
  deckRecipeFor,
  isExpansion,
  partyForRole,
  powerFor,
  roleCounts,
  rolesFor,
} from './constants'
import { growDeckForFiveYearPlan, makeDeck } from './deck'
import { createGame, knowledgeFor, livingPlayers, secretStep, selectPublicView, transition, validateSetup } from './engine'
import { seededRng } from './rng'
import { parseSave } from '../stores/game'
import type { GameAction, GameState, Policy, Power } from './types'

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

function idOf(state: GameState, role: 'liberal' | 'fascist' | 'hitler' | 'communist'): number {
  const player = state.players.find((p) => p.role === role)
  if (!player) throw new Error(`no ${role}`)
  return player.id
}

function totalTiles(state: GameState): number {
  const leg = state.legislative
  const inHand = leg
    ? leg.presidentHand.length + leg.chancellorHand.length + (leg.presidentDiscard ? 1 : 0)
    : 0
  return (
    state.deck.length +
    state.discard.length +
    state.enactedLiberal +
    state.enactedFascist +
    state.enactedCommunist +
    inHand
  )
}

function countOf(cards: Policy[], policy: Policy): number {
  return cards.filter((card) => card === policy).length
}

/** A fabricated chancellor phase with consistent policy totals for the deck assertions. */
function legislative(
  state: GameState,
  counts: { liberal?: number; fascist?: number; communist?: number },
  chancellorHand: [Policy, Policy],
): GameState {
  return {
    ...state,
    enactedLiberal: counts.liberal ?? 0,
    enactedFascist: counts.fascist ?? 0,
    enactedCommunist: counts.communist ?? 0,
    phase: 'legislativeChancellor',
    legislative: {
      presidentHand: [],
      chancellorHand,
      presidentDiscard: 'liberal',
      vetoRequested: false,
    },
  }
}

describe('expansion role table', () => {
  it('adds the 11-13 rows with exactly one Hitler each', () => {
    expect(MIN_PLAYERS).toBe(5)
    expect(MAX_PLAYERS).toBe(13)
    expect(EXPANSION_MIN).toBe(11)
    expect(ROLE_TABLE[11]).toEqual({ liberal: 5, fascist: 3, communist: 2, hitler: 1 })
    expect(ROLE_TABLE[12]).toEqual({ liberal: 6, fascist: 3, communist: 2, hitler: 1 })
    expect(ROLE_TABLE[13]).toEqual({ liberal: 6, fascist: 3, communist: 3, hitler: 1 })
    expect(rolesFor(14)).toBeNull()
    expect(roleCounts(13)?.communist).toBe(3)
    expect(roleCounts(10)?.communist).toBeUndefined()
  })

  it('accepts 5-13 and reports the widened range for 14', () => {
    expect(validateSetup({ playerCount: 13, names: names(13) })).toBeNull()
    expect(validateSetup({ playerCount: 11, names: names(11) })).toBeNull()
    expect(validateSetup({ playerCount: 14, names: names(14) })).toEqual({
      code: 'invalidPlayerCount',
      params: { min: 5, max: 13 },
    })
  })

  it('assigns exactly the 11-13 distribution across 10,000 seeded runs per count', () => {
    for (const count of [11, 12, 13]) {
      const expected = ROLE_TABLE[count]!
      for (let run = 0; run < 10_000; run++) {
        const state = created(count, run + count * 100_000)
        const roles = state.players.map((player) => player.role)
        expect(roles).toHaveLength(count)
        expect(roles.filter((role) => role === 'liberal')).toHaveLength(expected.liberal)
        expect(roles.filter((role) => role === 'fascist')).toHaveLength(expected.fascist)
        expect(roles.filter((role) => role === 'communist')).toHaveLength(expected.communist ?? 0)
        expect(roles.filter((role) => role === 'hitler')).toHaveLength(1)
      }
    }
  }, 120_000)
})

describe('deck recipe', () => {
  it('keeps the 5-10 deck and tracks byte-identical', () => {
    expect(DECK_LIBERAL).toBe(6)
    expect(DECK_FASCIST).toBe(11)
    expect(DECK_TOTAL).toBe(17)
    expect(LIBERAL_TRACK).toBe(5)
    expect(FASCIST_TRACK).toBe(6)
    expect(DECK_COMMUNIST).toBe(8)
    expect(COMMUNIST_TRACK).toBe(6)
    expect(COMMUNIST_DECK).toEqual({ liberal: 5, fascist: 10, communist: 8 })

    for (const count of [5, 6, 7, 8, 9, 10]) {
      expect(deckRecipeFor(count)).toEqual({ liberal: 6, fascist: 11, communist: 0 })
    }
    for (const count of [11, 12, 13]) {
      expect(deckRecipeFor(count)).toEqual(COMMUNIST_DECK)
      expect(isExpansion(count)).toBe(true)
    }
    expect(isExpansion(10)).toBe(false)
    expect(isExpansion(14)).toBe(false)
  })

  it('builds 17 tiles at 5-10 and the 23-tile XL deck at 11-13', () => {
    for (const count of [5, 6, 7, 8, 9, 10]) {
      const deck = makeDeck(count)
      expect(deck).toHaveLength(DECK_TOTAL)
      expect(deck.filter((card) => card === 'liberal')).toHaveLength(DECK_LIBERAL)
      expect(deck.filter((card) => card === 'fascist')).toHaveLength(DECK_FASCIST)
      expect(deck).not.toContain('communist')
    }
    for (const count of [11, 12, 13]) {
      const deck = makeDeck(count)
      expect(deck).toHaveLength(23)
      expect(deck.filter((card) => card === 'communist')).toHaveLength(DECK_COMMUNIST)
      expect(deck.filter((card) => card === 'liberal')).toHaveLength(COMMUNIST_DECK.liberal)
      expect(deck.filter((card) => card === 'fascist')).toHaveLength(COMMUNIST_DECK.fascist)
    }
  })

  it('uses the 9-10 fascist board above 10 and the Communist track order', () => {
    for (const count of [11, 12, 13]) {
      for (let space = 1; space <= 5; space++) {
        expect(powerFor(count, space)).toBe(BOARD_POWERS[9]![space - 1])
      }
      expect(powerFor(count, 6)).toBe('none')
      expect(COMMUNIST_POWERS[count as 11 | 12 | 13]).toEqual([
        'none',
        'radicalise',
        'fiveYearPlan',
        'radicalise',
        'confession',
        'none',
      ])
    }
    expect(communistPowerFor(11, 1)).toBe('none')
    expect(communistPowerFor(11, 2)).toBe('radicalise')
    expect(communistPowerFor(11, 3)).toBe('fiveYearPlan')
    expect(communistPowerFor(11, 4)).toBe('radicalise')
    expect(communistPowerFor(11, 5)).toBe('confession')
    expect(communistPowerFor(10, 2)).toBe('none')
  })
})

describe('party assignment', () => {
  it('derives each saved party from its role and marks 11-13 as the expansion', () => {
    for (const count of [5, 10, 11, 12, 13]) {
      const state = created(count)
      for (const player of state.players) {
        expect(player.party).toBe(partyForRole(player.role))
      }
      expect(state.expansion).toBe(count >= EXPANSION_MIN ? 'communist' : null)
      expect(state.enactedCommunist).toBe(0)
      expect(state.confessions).toEqual([])
      expect(state.radicalisation).toBeNull()
      expect(state.confession).toBeNull()
    }
    expect(created(11).players.some((player) => player.party === 'communist')).toBe(true)
  })

  it('stores the expansion state across a save round-trip', () => {
    const state = created(13)
    const parsed = parseSave(JSON.stringify(state))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.schemaVersion).toBe(2)
    expect(parsed.state.expansion).toBe('communist')
    expect(parsed.state.enactedCommunist).toBe(0)
    expect(parsed.state.players.map((player) => player.party)).toEqual(
      state.players.map((player) => player.party),
    )
  })
})

describe('save migration', () => {
  it('maps a v1 save to v2 with party, winners and new-field defaults', () => {
    const current = JSON.parse(JSON.stringify(created(5))) as Record<string, unknown> & {
      players: Array<Record<string, unknown>>
    }
    current.schemaVersion = 1
    delete current.expansion
    delete current.enactedCommunist
    delete current.confessions
    delete current.radicalisation
    delete current.confession
    for (const player of current.players) delete player.party
    current.gameOver = { winner: 'liberal', reason: 'liberalPolicies' }
    current.phase = 'gameOver'

    const parsed = parseSave(JSON.stringify(current))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.schemaVersion).toBe(2)
    expect(parsed.state.expansion).toBeNull()
    expect(parsed.state.enactedCommunist).toBe(0)
    expect(parsed.state.confessions).toEqual([])
    expect(parsed.state.radicalisation).toBeNull()
    expect(parsed.state.confession).toBeNull()
    expect(parsed.state.gameOver).toEqual({ winners: ['liberal'], reason: 'liberalPolicies' })
    for (const player of parsed.state.players) {
      expect(player.party).toBe(partyForRole(player.role))
    }
  })

  it('still refuses Communist content in a 5-10 save', () => {
    const raw = JSON.parse(JSON.stringify(created(5))) as {
      players: Array<{ party: string }>
      deck: string[]
    }
    raw.players[0].party = 'communist'
    expect(parseSave(JSON.stringify(raw))).toEqual({ error: 'corrupt' })

    raw.players[0].party = 'liberal'
    raw.deck[0] = 'communist'
    expect(parseSave(JSON.stringify(raw))).toEqual({ error: 'corrupt' })

    const withTrack = JSON.parse(JSON.stringify(created(5))) as { enactedCommunist: number }
    withTrack.enactedCommunist = 1
    expect(parseSave(JSON.stringify(withTrack))).toEqual({ error: 'corrupt' })
  })
})

describe('secretStep', () => {
  it('derives the pass-the-phone step without a stored field', () => {
    const state = created(11)
    expect(secretStep(state)).toBeNull()
    expect(
      secretStep({
        ...state,
        phase: 'communistPower',
        pendingAction: { type: 'radicalise', actorId: 0 },
      }),
    ).toBe('radicalisePick')
    expect(
      secretStep({
        ...state,
        phase: 'communistPower',
        pendingAction: { type: 'fiveYearPlan', actorId: 0 },
      }),
    ).toBe('fiveYearPlan')
    expect(
      secretStep({
        ...state,
        phase: 'communistPower',
        pendingAction: { type: 'confession', actorId: 0 },
      }),
    ).toBe('confession')

    const reveal = {
      ...state,
      phase: 'radicalisationReveal' as const,
      radicalisation: { targetId: 0, before: 'liberal' as const, after: 'communist' as const, revealIndex: 0 },
    }
    expect(secretStep(reveal)).toBe('radicaliseReveal')
    expect(secretStep({ ...reveal, radicalisation: { ...reveal.radicalisation, revealIndex: 11 } })).toBe(
      'radicaliseDone',
    )
  })
})

describe('expansion deck arithmetic', () => {
  it('starts with 23 tiles and keeps deck + discard + enacted at 23 through a session', () => {
    for (const count of [11, 12, 13]) {
      const state = revealed(count)
      expect(state.deck).toHaveLength(23)
      expect(totalTiles(state)).toBe(23)
      expect(countOf(state.deck, 'communist')).toBe(8)
      expect(countOf(state.deck, 'liberal')).toBe(5)
      expect(countOf(state.deck, 'fascist')).toBe(10)
    }

    let state = revealed(13)
    const chancellor = state.players.find((p) => p.id !== state.presidentId)!.id
    state = act(state, { type: 'nominate', playerId: chancellor })
    state = act(state, { type: 'vote', approved: true })
    expect(state.phase).toBe('legislativePresident')
    expect(state.legislative!.presidentHand).toHaveLength(3)
    expect(totalTiles(state)).toBe(23)

    state = act(state, { type: 'presidentDiscard', index: 0 })
    expect(state.legislative!.chancellorHand).toHaveLength(2)
    expect(totalTiles(state)).toBe(23)

    state = act(state, { type: 'chancellorEnact', index: 0 })
    expect(state.discard).toHaveLength(2)
    expect(totalTiles(state)).toBe(23)
  })

  it('grows to 26 on Five-Year Plan and the acknowledgement leaves the deck untouched', () => {
    const base = revealed(11)
    const deck = [...base.deck]
    const take = (policy: Policy): Policy => {
      const index = deck.indexOf(policy)
      if (index < 0) throw new Error(`no ${policy} left`)
      return deck.splice(index, 1)[0]
    }
    // Two Communists are already on the track; three tiles are in this session's draw.
    take('communist')
    take('communist')
    const presidentDiscard = take('liberal')
    const chancellorHand: [Policy, Policy] = [take('communist'), take('liberal')]
    const state: GameState = {
      ...base,
      deck,
      enactedCommunist: 2,
      phase: 'legislativeChancellor',
      legislative: { presidentHand: [], chancellorHand, presidentDiscard, vetoRequested: false },
    }
    expect(totalTiles(state)).toBe(23)
    const deckBefore = [...state.deck]

    let after = act(state, { type: 'chancellorEnact', index: 0 })
    expect(after.enactedCommunist).toBe(3)
    expect(after.phase).toBe('communistPower')
    expect(after.pendingAction).toEqual({ type: 'fiveYearPlan', actorId: state.presidentId })
    expect(after.deck).toHaveLength(deckBefore.length + 3)
    expect(countOf(after.deck, 'communist')).toBe(countOf(deckBefore, 'communist') + 2)
    expect(countOf(after.deck, 'liberal')).toBe(countOf(deckBefore, 'liberal') + 1)
    expect(countOf(after.deck, 'fascist')).toBe(countOf(deckBefore, 'fascist'))
    expect(after.discard).toEqual([presidentDiscard, 'liberal'])
    expect(totalTiles(after)).toBe(26)

    const deckAtAck = [...after.deck]
    const discardAtAck = [...after.discard]
    const parsed = parseSave(JSON.stringify(after))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.phase).toBe('communistPower')
    expect(secretStep(parsed.state)).toBe('fiveYearPlan')
    const tally = (s: GameState) =>
      s.deck.length + s.discard.length + s.enactedLiberal + s.enactedFascist + s.enactedCommunist
    after = act(parsed.state, { type: 'acknowledgeFiveYearPlan' })
    expect(after.phase).toBe('nomination')
    expect(after.pendingAction).toBeNull()
    expect(after.legislative).toBeNull()
    expect(after.deck).toEqual(deckAtAck)
    expect(after.discard).toEqual(discardAtAck)
    expect(after.enactedLiberal).toBe(parsed.state.enactedLiberal)
    expect(after.enactedFascist).toBe(parsed.state.enactedFascist)
    expect(after.enactedCommunist).toBe(3)
    expect(tally(after)).toBe(tally(parsed.state))
    expect(totalTiles(after)).toBe(26)

    const early = transition(revealed(11), { type: 'acknowledgeFiveYearPlan' }, seededRng(1))
    expect(early.ok).toBe(false)
    if (!early.ok) expect(early.error.code).toBe('invalidPhase')
  })

  it('adds exactly 2 Communist + 1 Liberal and shuffles without mutating the input', () => {
    const deck: Policy[] = ['fascist', 'fascist', 'fascist', 'liberal']
    const grown = growDeckForFiveYearPlan(deck, seededRng(5))
    expect(grown).toHaveLength(7)
    expect(countOf(grown, 'communist')).toBe(2)
    expect(countOf(grown, 'liberal')).toBe(2)
    expect(countOf(grown, 'fascist')).toBe(3)
    expect(deck).toEqual(['fascist', 'fascist', 'fascist', 'liberal'])
    expect(grown).not.toEqual([...deck, 'communist', 'communist', 'liberal'])
  })
})

describe('Communist track', () => {
  const powers: Power[] = ['none', 'radicalise', 'fiveYearPlan', 'radicalise', 'confession', 'none']

  it('advances in order and resolves each space power once', () => {
    for (const count of [11, 12, 13]) {
      for (let space = 1; space <= 6; space++) {
        const power = powers[space - 1]
        expect(communistPowerFor(count as 11 | 12 | 13, space)).toBe(power)
        const state = legislative(
          revealed(count),
          { communist: space - 1 },
          ['communist', 'liberal'],
        )
        const after = act(state, { type: 'chancellorEnact', index: 0 })
        expect(after.enactedCommunist).toBe(space)
        expect(after.tracker).toBe(0)
        if (space === 6) {
          expect(after.gameOver).toEqual({ winners: ['communist'], reason: 'communistPolicies' })
          expect(after.phase).toBe('gameOver')
          expect(after.pendingAction).toBeNull()
        } else if (power === 'none') {
          expect(after.pendingAction).toBeNull()
          expect(after.phase).toBe('nomination')
        } else {
          expect(after.pendingAction).toEqual({ type: power, actorId: state.presidentId })
          expect(after.phase).toBe('communistPower')
        }
      }
    }
  })

  it('uses the 9-10 Fascist board at 11-13 and still ends on the sixth fascist policy', () => {
    const board = BOARD_POWERS[9]!
    expect(board).toEqual(['investigate', 'investigate', 'special', 'execute', 'execute'])
    for (const count of [11, 12, 13]) {
      for (let space = 1; space <= 6; space++) {
        expect(powerFor(count, space)).toBe(powerFor(9, space))
      }
      for (let space = 1; space <= 5; space++) {
        expect(powerFor(count, space)).toBe(board[space - 1])
      }
      expect(powerFor(count, 6)).toBe('none')

      const after = act(legislative(revealed(count), { fascist: 5 }, ['fascist', 'liberal']), {
        type: 'chancellorEnact',
        index: 0,
      })
      expect(after.gameOver).toEqual({ winners: ['fascist'], reason: 'fascistPolicies' })
      expect(after.pendingAction).toBeNull()
    }
  })
})

describe('expansion victory set', () => {
  it('keeps the 5-10 endings single-winner and adds the Communist-only and joint endings', () => {
    const liberalWin = (count: number) =>
      act(legislative(revealed(count), { liberal: 4 }, ['liberal', 'fascist']), {
        type: 'chancellorEnact',
        index: 0,
      })
    const fascistWin = (count: number) =>
      act(legislative(revealed(count), { fascist: 5 }, ['fascist', 'liberal']), {
        type: 'chancellorEnact',
        index: 0,
      })

    expect(liberalWin(5).gameOver).toEqual({ winners: ['liberal'], reason: 'liberalPolicies' })
    expect(liberalWin(11).gameOver).toEqual({ winners: ['liberal'], reason: 'liberalPolicies' })
    expect(fascistWin(5).gameOver).toEqual({ winners: ['fascist'], reason: 'fascistPolicies' })
    expect(fascistWin(11).gameOver).toEqual({ winners: ['fascist'], reason: 'fascistPolicies' })

    const electedState = revealed(11)
    const elected = act(
      { ...electedState, enactedFascist: 3, phase: 'voting', nomineeId: idOf(electedState, 'hitler') },
      { type: 'vote', approved: true },
    )
    expect(elected.gameOver).toEqual({ winners: ['fascist'], reason: 'hitlerElected' })

    for (const count of [5, 11, 12, 13]) {
      const state = revealed(count)
      const executed = act(
        {
          ...state,
          phase: 'executive',
          pendingAction: { type: 'execute', actorId: state.presidentId },
        },
        { type: 'execute', playerId: idOf(state, 'hitler') },
      )
      expect(executed.gameOver).toEqual({
        winners: count >= EXPANSION_MIN ? ['liberal', 'communist'] : ['liberal'],
        reason: 'hitlerExecuted',
      })
      expect(executed.phase).toBe('gameOver')
    }
  })
})

describe('no stale secret state', () => {
  it('clears radicalisation and confession when a round starts or the game ends', () => {
    const stale = {
      ...revealed(11),
      radicalisation: {
        targetId: 0,
        before: 'liberal' as const,
        after: 'communist' as const,
        revealIndex: 0,
      },
      confession: { playerId: 0, party: 'liberal' as const },
    }

    const ended = act(legislative(stale, { liberal: 4 }, ['liberal', 'fascist']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(ended.phase).toBe('gameOver')
    expect(ended.radicalisation).toBeNull()
    expect(ended.confession).toBeNull()

    const next = act(legislative(stale, {}, ['liberal', 'fascist']), {
      type: 'chancellorEnact',
      index: 0,
    })
    expect(next.phase).toBe('nomination')
    expect(next.radicalisation).toBeNull()
    expect(next.confession).toBeNull()
  })
})

describe('chaos and the Communist track', () => {
  it('advances without a power and can win on space 6', () => {
    const chaos = (enactedCommunist: number): GameState => {
      let state = revealed(11)
      state = {
        ...state,
        enactedCommunist,
        tracker: 2,
        deck: ['communist', ...state.deck.slice(1)],
      }
      state = act(state, {
        type: 'nominate',
        playerId: state.players.find((p) => p.id !== state.presidentId)!.id,
      })
      return act(state, { type: 'vote', approved: false })
    }

    const advanced = chaos(1)
    expect(advanced.enactedCommunist).toBe(2)
    expect(advanced.phase).toBe('nomination')
    expect(advanced.pendingAction).toBeNull()
    expect(advanced.gameOver).toBeNull()

    const won = chaos(5)
    expect(won.enactedCommunist).toBe(6)
    expect(won.gameOver).toEqual({ winners: ['communist'], reason: 'communistPolicies' })
    expect(won.phase).toBe('gameOver')
    expect(won.pendingAction).toBeNull()
  })
})

describe('radicalisation', () => {
  function radicalisePending(state: GameState): GameState {
    return {
      ...state,
      phase: 'communistPower',
      pendingAction: { type: 'radicalise', actorId: state.presidentId },
    }
  }

  function convert(state: GameState, targetId: number): GameState {
    return act(radicalisePending(state), { type: 'radicalise', playerId: targetId })
  }

  function rolePlayer(state: GameState, role: 'liberal' | 'fascist' | 'hitler' | 'communist') {
    const player = state.players.find((p) => p.role === role)
    if (!player) throw new Error(`no ${role}`)
    return player
  }

  it('converts a living Liberal or Fascist permanently and keeps the secret role', () => {
    for (const role of ['liberal', 'fascist'] as const) {
      const state = revealed(11)
      const target = rolePlayer(state, role)
      const after = convert(state, target.id)

      expect(after.phase).toBe('radicalisationReveal')
      expect(after.pendingAction).toBeNull()
      expect(after.radicalisation).toEqual({
        targetId: target.id,
        before: role,
        after: 'communist',
        revealIndex: 0,
      })
      const converted = after.players.find((p) => p.id === target.id)!
      expect(converted.party).toBe('communist')
      expect(converted.role).toBe(role)
      for (const other of state.players.filter((p) => p.id !== target.id)) {
        expect(after.players.find((p) => p.id === other.id)!.party).toBe(other.party)
      }

      // Permanent: walking out the reveal and starting the next round keeps the party.
      let done = after
      for (let i = 0; i < livingPlayers(done).length; i++) {
        done = act(done, { type: 'nextRadicalisationReveal' })
      }
      done = act(done, { type: 'finishRadicalisation' })
      expect(done.phase).toBe('nomination')
      expect(done.radicalisation).toBeNull()
      expect(done.players.find((p) => p.id === target.id)!.party).toBe('communist')
    }
  })

  it('treats Hitler and an existing Communist as valid no-ops', () => {
    for (const role of ['hitler', 'communist'] as const) {
      const state = revealed(11)
      const target = rolePlayer(state, role)
      const after = convert(state, target.id)

      expect(after.phase).toBe('radicalisationReveal')
      expect(after.pendingAction).toBeNull()
      expect(after.radicalisation).toEqual({
        targetId: target.id,
        before: target.party,
        after: target.party,
        revealIndex: 0,
      })
      const unchanged = after.players.find((p) => p.id === target.id)!
      expect(unchanged.party).toBe(target.party)
      expect(unchanged.role).toBe(role)
    }
    // A converted player's party is never written back onto Hitler.
    expect(created(11).players.find((p) => p.role === 'hitler')!.party).toBe('fascist')
  })

  it('lets the President target themself and rejects a dead target', () => {
    const base = revealed(11)
    const president = rolePlayer(base, 'liberal')
    const state: GameState = { ...base, presidentId: president.id }
    const after = convert(state, president.id)
    expect(after.radicalisation?.targetId).toBe(president.id)
    expect(after.players.find((p) => p.id === president.id)!.party).toBe('communist')
    expect(after.phase).toBe('radicalisationReveal')

    const deadState: GameState = {
      ...base,
      players: base.players.map((p) => (p.id === president.id ? { ...p, alive: false } : p)),
    }
    const rejected = transition(
      radicalisePending(deadState),
      { type: 'radicalise', playerId: president.id },
      seededRng(1),
    )
    expect(rejected.ok).toBe(false)
    if (!rejected.ok) expect(rejected.error.code).toBe('playerEliminated')
  })

  it('investigates converted players as Communist and keeps their old role knowledge', () => {
    const state = revealed(11)
    const liberal = rolePlayer(state, 'liberal')
    const fascist = rolePlayer(state, 'fascist')
    const hitler = rolePlayer(state, 'hitler')

    const liberalConverted = convert(state, liberal.id)
    const investigated = act(
      {
        ...liberalConverted,
        phase: 'executive' as const,
        pendingAction: { type: 'investigate' as const, actorId: liberalConverted.presidentId },
      },
      { type: 'investigate', playerId: liberal.id },
    )
    expect(investigated.investigation).toEqual({ playerId: liberal.id, party: 'communist' })

    const liberalKnowledge = knowledgeFor(liberalConverted, liberal.id)
    expect(liberalKnowledge.party).toBe('communist')
    expect(liberalKnowledge.communists).toEqual([])
    expect(liberalKnowledge.fascists).toEqual([])
    expect(liberalKnowledge.hitler).toBeNull()

    const fascistConverted = convert(state, fascist.id)
    const fascistKnowledge = knowledgeFor(fascistConverted, fascist.id)
    expect(fascistKnowledge.party).toBe('communist')
    expect(fascistKnowledge.communists).toEqual([])
    expect(fascistKnowledge.hitler).toBe(hitler.name)
    expect(fascistKnowledge.fascists).toEqual(
      state.players
        .filter((p) => p.role === 'fascist' && p.id !== fascist.id)
        .map((p) => p.name),
    )

    const fascistInvestigated = act(
      {
        ...fascistConverted,
        phase: 'executive' as const,
        pendingAction: { type: 'investigate' as const, actorId: fascistConverted.presidentId },
      },
      { type: 'investigate', playerId: fascist.id },
    )
    expect(fascistInvestigated.investigation).toEqual({
      playerId: fascist.id,
      party: 'communist',
    })
  })

  it('shows Communists only the other Communists and keeps Hitler blind at 11+', () => {
    const state = revealed(13)
    const communists = state.players.filter((p) => p.role === 'communist')
    expect(communists).toHaveLength(3)
    for (const player of communists) {
      const knowledge = knowledgeFor(state, player.id)
      expect(knowledge.communists).toEqual(
        communists.filter((p) => p.id !== player.id).map((p) => p.name),
      )
      expect(knowledge.fascists).toEqual([])
      expect(knowledge.hitler).toBeNull()
    }
    const hitler = rolePlayer(state, 'hitler')
    expect(knowledgeFor(state, hitler.id)).toEqual({
      role: 'hitler',
      party: 'fascist',
      fascists: [],
      hitler: null,
      communists: [],
    })
  })

  it('walks every living player in seat order, skipping the dead, then starts the next round', () => {
    const base = revealed(11)
    const victim = base.players.find(
      (p) => p.role === 'liberal' && p.id !== base.presidentId,
    )!
    const state: GameState = {
      ...base,
      players: base.players.map((p) => (p.id === victim.id ? { ...p, alive: false } : p)),
    }
    let walk = convert(state, rolePlayer(state, 'fascist').id)
    const order = livingPlayers(walk)
    expect(order).toHaveLength(10)
    expect(order.map((p) => p.id)).not.toContain(victim.id)
    expect(walk.radicalisation!.revealIndex).toBe(0)

    for (let i = 1; i < order.length; i++) {
      walk = act(walk, { type: 'nextRadicalisationReveal' })
      expect(walk.radicalisation!.revealIndex).toBe(i)
    }
    const early = transition(walk, { type: 'finishRadicalisation' }, seededRng(1))
    expect(early.ok).toBe(false)
    if (!early.ok) expect(early.error.code).toBe('invalidPhase')

    walk = act(walk, { type: 'nextRadicalisationReveal' })
    expect(walk.radicalisation!.revealIndex).toBe(order.length)
    const extra = transition(walk, { type: 'nextRadicalisationReveal' }, seededRng(1))
    expect(extra.ok).toBe(false)
    if (!extra.ok) expect(extra.error.code).toBe('invalidPhase')

    const finished = act(walk, { type: 'finishRadicalisation' })
    expect(finished.phase).toBe('nomination')
    expect(finished.radicalisation).toBeNull()
    expect(finished.pendingAction).toBeNull()
    expect(finished.round).toBe(walk.round + 1)
  })

  it('does not re-apply or duplicate a conversion after a save round-trip', () => {
    const state = revealed(12)
    const target = rolePlayer(state, 'liberal')
    const partiesBefore = state.players.map((p) => p.party)
    const communistsBefore = state.players.filter((p) => p.party === 'communist').length
    const reveal = convert(state, target.id)

    const parsed = parseSave(JSON.stringify(reveal))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.phase).toBe('radicalisationReveal')
    expect(parsed.state.radicalisation).toEqual(reveal.radicalisation)
    expect(parsed.state.players.map((p) => p.party)).toEqual(reveal.players.map((p) => p.party))
    expect(parsed.state.players.filter((p) => p.party === 'communist')).toHaveLength(
      communistsBefore + 1,
    )

    let resumed = parsed.state
    for (let i = 0; i < livingPlayers(resumed).length; i++) {
      resumed = act(resumed, { type: 'nextRadicalisationReveal' })
    }
    resumed = act(resumed, { type: 'finishRadicalisation' })
    expect(resumed.radicalisation).toBeNull()
    expect(resumed.phase).toBe('nomination')

    const changed = resumed.players.filter((p, i) => p.party !== partiesBefore[i])
    expect(changed).toHaveLength(1)
    expect(changed[0].id).toBe(target.id)
    expect(changed[0].party).toBe('communist')
    expect(resumed.players.filter((p) => p.party === 'communist')).toHaveLength(
      communistsBefore + 1,
    )
  })

  it('keeps 5-10 games out of Radicalisation and investigates by party', () => {
    const base = revealed(5)
    const wrongPhase = transition(base, { type: 'radicalise', playerId: 1 }, seededRng(1))
    expect(wrongPhase.ok).toBe(false)
    if (!wrongPhase.ok) expect(wrongPhase.error.code).toBe('invalidPhase')

    const wrongAction = transition(
      {
        ...base,
        phase: 'communistPower',
        pendingAction: { type: 'fiveYearPlan', actorId: base.presidentId },
      },
      { type: 'radicalise', playerId: 1 },
      seededRng(1),
    )
    expect(wrongAction.ok).toBe(false)
    if (!wrongAction.ok) expect(wrongAction.error.code).toBe('invalidPhase')

    for (const role of ['liberal', 'fascist', 'hitler'] as const) {
      const target = rolePlayer(base, role)
      const investigated = act(
        {
          ...base,
          phase: 'executive' as const,
          pendingAction: { type: 'investigate' as const, actorId: base.presidentId },
        },
        { type: 'investigate', playerId: target.id },
      )
      expect(investigated.investigation).toEqual({
        playerId: target.id,
        party: role === 'liberal' ? 'liberal' : 'fascist',
      })
    }
  })
})

describe('confession', () => {
  function confessionPending(extra: Partial<GameState> = {}): GameState {
    const base = { ...revealed(11), ...extra }
    const president = base.players.find((p) => p.role === 'liberal')!
    return act(
      legislative(
        { ...base, presidentId: president.id },
        { communist: 4 },
        ['communist', 'liberal'],
      ),
      { type: 'chancellorEnact', index: 0 },
    )
  }

  it('snapshots the sitting President party and publishes it only after acknowledgement', () => {
    const previous = { playerId: 0, party: 'fascist' as const, round: 1 }
    const state = confessionPending({ confessions: [previous] })
    const president = state.players.find((p) => p.id === state.presidentId)!
    expect(president.party).toBe('liberal')
    expect(state.phase).toBe('communistPower')
    expect(state.pendingAction).toEqual({ type: 'confession', actorId: president.id })
    expect(state.confession).toEqual({ playerId: president.id, party: 'liberal' })
    expect(secretStep(state)).toBe('confession')
    // The pending confession is not public yet; earlier records still are.
    expect(state.confessions).toEqual([previous])
    expect(selectPublicView(state).confessions).toEqual([previous])

    const acked = act(state, { type: 'acknowledgeConfession' })
    expect(acked.phase).toBe('nomination')
    expect(acked.pendingAction).toBeNull()
    expect(acked.confession).toBeNull()
    expect(acked.round).toBe(state.round + 1)
    expect(acked.confessions).toEqual([
      previous,
      { playerId: president.id, party: 'liberal', round: state.round },
    ])
    expect(selectPublicView(acked).confessions).toEqual(acked.confessions)
  })

  it('keeps the snapshot party when the President is converted later', () => {
    const pending = confessionPending()
    const presidentId = pending.confession!.playerId
    const actorId = pending.pendingAction!.actorId

    // Convert the President between the snapshot and the ack: the record must
    // carry the party stored at commit time, not the player's current party.
    const converted = act(
      {
        ...pending,
        phase: 'communistPower',
        pendingAction: { type: 'radicalise', actorId },
      },
      { type: 'radicalise', playerId: presidentId },
    )
    expect(converted.players.find((p) => p.id === presidentId)!.party).toBe('communist')
    const acked = act(
      {
        ...converted,
        phase: 'communistPower',
        radicalisation: null,
        pendingAction: { type: 'confession', actorId },
      },
      { type: 'acknowledgeConfession' },
    )
    expect(acked.confessions).toEqual([
      { playerId: presidentId, party: 'liberal', round: pending.round },
    ])

    // A real conversion after the ack leaves the historic record untouched too.
    const later = act(
      {
        ...acked,
        phase: 'communistPower',
        pendingAction: { type: 'radicalise', actorId: acked.presidentId },
      },
      { type: 'radicalise', playerId: presidentId },
    )
    expect(later.players.find((p) => p.id === presidentId)!.party).toBe('communist')
    expect(later.players.find((p) => p.id === presidentId)!.role).toBe('liberal')
    expect(later.confessions).toEqual(acked.confessions)
  })

  it('is mandatory and rejects a wrong phase or a missing snapshot', () => {
    const pending = confessionPending()

    const wrongPhase = transition(revealed(11), { type: 'acknowledgeConfession' }, seededRng(1))
    expect(wrongPhase.ok).toBe(false)
    if (!wrongPhase.ok) expect(wrongPhase.error.code).toBe('invalidPhase')

    const wrongPower = transition(
      { ...pending, pendingAction: { type: 'fiveYearPlan', actorId: pending.presidentId } },
      { type: 'acknowledgeConfession' },
      seededRng(1),
    )
    expect(wrongPower.ok).toBe(false)
    if (!wrongPower.ok) expect(wrongPower.error.code).toBe('invalidPhase')

    const noSnapshot = transition(
      { ...pending, confession: null },
      { type: 'acknowledgeConfession' },
      seededRng(1),
    )
    expect(noSnapshot.ok).toBe(false)
    if (!noSnapshot.ok) expect(noSnapshot.error.code).toBe('invalidPhase')

    // No skip: the Five-Year-Plan acknowledgement cannot dismiss a Confession.
    const skip = transition(pending, { type: 'acknowledgeFiveYearPlan' }, seededRng(1))
    expect(skip.ok).toBe(false)
    if (!skip.ok) expect(skip.error.code).toBe('invalidPhase')
    expect(pending.confessions).toEqual([])
  })

  it('resumes at the same confession step after a reload and appends exactly one record', () => {
    const pending = confessionPending()
    const parsed = parseSave(JSON.stringify(pending))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.phase).toBe('communistPower')
    expect(secretStep(parsed.state)).toBe('confession')
    expect(parsed.state.confession).toEqual(pending.confession)
    expect(parsed.state.confessions).toEqual([])

    const resumed = act(parsed.state, { type: 'acknowledgeConfession' })
    expect(resumed.confessions).toEqual([
      {
        playerId: pending.confession!.playerId,
        party: pending.confession!.party,
        round: pending.round,
      },
    ])
    const again = transition(resumed, { type: 'acknowledgeConfession' }, seededRng(1))
    expect(again.ok).toBe(false)
    if (!again.ok) expect(again.error.code).toBe('invalidPhase')
    expect(resumed.confessions).toHaveLength(1)
  })
})



