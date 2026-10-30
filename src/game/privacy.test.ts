import { describe, expect, it } from 'vitest'
import { createGame, eligibility, livingPlayers, selectPublicView, transition } from './engine'
import { seededRng } from './rng'
import type { GameAction, GameState, Policy, PublicView } from './types'

/** Distinct, non-overlapping names so one name occurrence is an unambiguous leak. */
const NAMES = [
  'Ana',
  'Brin',
  'Cato',
  'Dov',
  'Elin',
  'Faro',
  'Gita',
  'Hale',
  'Iris',
  'Jori',
  'Kemal',
  'Lior',
  'Mira',
]

const FORBIDDEN_KEYS = new Set([
  'role',
  'party',
  'knowledge',
  'fascists',
  'hitler',
  'communists',
  'radicalisation',
  'confession',
  'targetId',
  'before',
  'after',
  'revealIndex',
  'deck',
  'discard',
  'presidentHand',
  'chancellorHand',
  'peeked',
  'investigation',
  'converted',
  'secretStep',
  'winner',
])

const PARTIES = new Set(['liberal', 'fascist', 'communist'])
/** The only place a party is published while a game runs. */
const CONFESSION_PARTY = /^confessions\.\d+\.party$/
/** The post-game reveal. */
const GAME_OVER_WINNER = /^gameOver\.winners\.\d+$/

/**
 * Recursively rejects any hidden-data key or party-like value in a public view.
 * Allowed party positions: `expansion` (the mode), `confessions[].party` (the
 * public Confession record) and `gameOver.winners` (the post-game reveal).
 */
function assertSafeView(view: PublicView): void {
  const visit = (value: unknown, path: string): void => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => visit(item, `${path}.${index}`))
      return
    }
    if (value !== null && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        const childPath = path ? `${path}.${key}` : key
        if (FORBIDDEN_KEYS.has(key) && !(key === 'party' && CONFESSION_PARTY.test(childPath))) {
          throw new Error(`forbidden key ${key} at ${childPath}`)
        }
        visit(child, childPath)
      }
      return
    }
    if (typeof value === 'string' && PARTIES.has(value)) {
      if (path === 'expansion' || CONFESSION_PARTY.test(path) || GAME_OVER_WINNER.test(path)) return
      throw new Error(`party-like value ${value} at ${path}`)
    }
  }
  visit(view, '')

  for (const player of view.players) {
    expect(Object.keys(player).sort()).toEqual(['alive', 'id', 'name'])
  }
  if (view.gameOver) {
    expect(Object.keys(view.gameOver).sort()).toEqual(['reason', 'winners'])
  }
}

function assertView(state: GameState): void {
  const view = selectPublicView(state)
  assertSafeView(view)
  // A player's name is public exactly once, in `players`; anywhere else it leaks context.
  const json = JSON.stringify(view)
  for (const player of view.players) {
    expect(json.split(player.name)).toHaveLength(2)
  }
}

function created(count: number, seed = 7): GameState {
  const result = createGame({ playerCount: count, names: NAMES.slice(0, count) }, seededRng(seed))
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

function eligibleId(state: GameState): number {
  const player = state.players.find((p) => eligibility(state, p.id).eligible)
  if (!player) throw new Error('no eligible player')
  return player.id
}

/**
 * A consistent chancellor phase for a chosen card, so `chancellorEnact` (a real
 * transition) produces the requested power/result.
 */
function enact(
  state: GameState,
  card: Policy,
  before: { liberal?: number; fascist?: number; communist?: number } = {},
  presidentId = state.presidentId,
): GameState {
  const other: Policy = card === 'liberal' ? 'fascist' : 'liberal'
  return act(
    {
      ...state,
      presidentId,
      enactedLiberal: before.liberal ?? 0,
      enactedFascist: before.fascist ?? 0,
      enactedCommunist: before.communist ?? 0,
      phase: 'legislativeChancellor',
      legislative: {
        presidentHand: [],
        chancellorHand: [card, other],
        presidentDiscard: 'liberal',
        vetoRequested: false,
      },
    },
    { type: 'chancellorEnact', index: 0 },
  )
}

// Base executive results, each produced by a real chancellorEnact.
function investigateResult(): GameState {
  const pending = enact(revealed(9), 'fascist')
  if (pending.phase !== 'executive' || pending.pendingAction?.type !== 'investigate') {
    throw new Error(`not an investigation: ${pending.phase}`)
  }
  const target = pending.players.find((p) => p.id !== pending.presidentId)!
  return act(pending, { type: 'investigate', playerId: target.id })
}

function peekResult(): GameState {
  const pending = enact(revealed(5), 'fascist', { fascist: 2 })
  if (pending.phase !== 'executive' || pending.pendingAction?.type !== 'peek') {
    throw new Error(`not a peek: ${pending.phase}`)
  }
  return pending
}

function specialPending(): GameState {
  const pending = enact(revealed(7), 'fascist', { fascist: 2 })
  if (pending.phase !== 'executive' || pending.pendingAction?.type !== 'special') {
    throw new Error(`not a special election: ${pending.phase}`)
  }
  return pending
}

function executePending(): GameState {
  const pending = enact(revealed(9), 'fascist', { fascist: 3 })
  if (pending.phase !== 'executive' || pending.pendingAction?.type !== 'execute') {
    throw new Error(`not an execution: ${pending.phase}`)
  }
  return pending
}

// Expansion secret steps, each produced by a real chancellorEnact.
function radicalisePick(): GameState {
  const state = revealed(11)
  const president = state.players.find((p) => p.role === 'liberal')!
  const pending = enact(state, 'communist', { communist: 1 }, president.id)
  if (pending.phase !== 'communistPower' || pending.pendingAction?.type !== 'radicalise') {
    throw new Error(`not a radicalisation pick: ${pending.phase}`)
  }
  return pending
}

function radicaliseReveal(): GameState {
  const pick = radicalisePick()
  // A Fascist target makes both `before` ('fascist') and `after` ('communist') leak-sensitive.
  const target = pick.players.find((p) => p.role === 'fascist')!
  let state = act(pick, { type: 'radicalise', playerId: target.id })
  for (let i = 0; i < 4; i++) state = act(state, { type: 'nextRadicalisationReveal' })
  return state
}

function radicaliseDone(): GameState {
  let state = radicaliseReveal()
  while (state.radicalisation!.revealIndex < livingPlayers(state).length) {
    state = act(state, { type: 'nextRadicalisationReveal' })
  }
  return state
}

function confessionPending(): GameState {
  const state = revealed(11)
  const president = state.players.find((p) => p.role === 'liberal' && p.party === 'liberal')!
  const pending = enact(state, 'communist', { communist: 4 }, president.id)
  if (pending.phase !== 'communistPower' || pending.pendingAction?.type !== 'confession') {
    throw new Error(`not a confession: ${pending.phase}`)
  }
  return pending
}

function fiveYearPlanPending(): GameState {
  const state = revealed(11)
  const president = state.players.find((p) => p.role === 'liberal')!
  const pending = enact(state, 'communist', { communist: 2 }, president.id)
  if (pending.phase !== 'communistPower' || pending.pendingAction?.type !== 'fiveYearPlan') {
    throw new Error(`not a Five-Year Plan: ${pending.phase}`)
  }
  return pending
}

function hitlerExecution(count: number): GameState {
  const pending = enact(revealed(count), 'fascist', { fascist: 3 })
  const hitler = pending.players.find((p) => p.role === 'hitler')!
  const over = act(pending, { type: 'execute', playerId: hitler.id })
  if (over.phase !== 'gameOver') throw new Error(`no execution ending: ${over.phase}`)
  return over
}

const phases: Array<[string, () => GameState]> = [
  ['setup / roleReveal (5 players)', () => created(5)],
  ['roleReveal (13 players)', () => created(13)],
  ['nomination', () => revealed(5)],
  [
    'voting',
    () => {
      const state = revealed(5)
      return act(state, { type: 'nominate', playerId: eligibleId(state) })
    },
  ],
  [
    'legislativePresident',
    () => {
      let state = revealed(5)
      state = act(state, { type: 'nominate', playerId: eligibleId(state) })
      return act(state, { type: 'vote', approved: true })
    },
  ],
  [
    'legislativeChancellor',
    () => {
      let state = revealed(5)
      state = act(state, { type: 'nominate', playerId: eligibleId(state) })
      state = act(state, { type: 'vote', approved: true })
      return act(state, { type: 'presidentDiscard', index: 0 })
    },
  ],
  ['executive investigate', investigateResult],
  ['executive investigate acknowledged', () => act(investigateResult(), { type: 'acknowledgeInvestigation' })],
  ['executive peek', peekResult],
  ['executive peek acknowledged', () => act(peekResult(), { type: 'acknowledgePeek' })],
  ['executive special pending', specialPending],
  [
    'executive special',
    () => {
      const pending = specialPending()
      return act(pending, { type: 'specialElection', playerId: eligibleId(pending) })
    },
  ],
  ['executive execute pending', executePending],
  [
    'executive execute',
    () => {
      const pending = executePending()
      const target = pending.players.find((p) => p.alive && p.role !== 'hitler')!
      return act(pending, { type: 'execute', playerId: target.id })
    },
  ],
  ['radicalisePick', radicalisePick],
  ['radicaliseReveal', radicaliseReveal],
  ['radicaliseDone', radicaliseDone],
  ['confession pending', confessionPending],
  ['confession acknowledged', () => act(confessionPending(), { type: 'acknowledgeConfession' })],
  ['Five-Year Plan pending', fiveYearPlanPending],
  ['game over: liberal policies', () => enact(revealed(5), 'liberal', { liberal: 4 })],
  ['game over: fascist policies', () => enact(revealed(5), 'fascist', { fascist: 5 })],
  ['game over: communist policies', () => enact(revealed(11), 'communist', { communist: 5 })],
  ['game over: Hitler executed at 5-10', () => hitlerExecution(5)],
  ['game over: Hitler executed at 11-13', () => hitlerExecution(11)],
]

describe('public view shape', () => {
  it('carries only public data: expansion fields at 11-13, none at 5-10', () => {
    const expansion = selectPublicView(created(11))
    expect(expansion.expansion).toBe('communist')
    expect(expansion.playerCount).toBe(11)
    expect(expansion.enactedLiberal).toBe(0)
    expect(expansion.enactedFascist).toBe(0)
    expect(expansion.enactedCommunist).toBe(0)
    expect(expansion.deckCount).toBe(23)
    expect(expansion.discardCount).toBe(0)
    expect(expansion.tracker).toBe(0)
    expect(expansion.round).toBe(1)
    expect(expansion.vetoUnlocked).toBe(false)
    expect(expansion.investigated).toEqual([])
    expect(expansion.pendingActionType).toBeNull()
    expect(expansion.confessions).toEqual([])
    expect(expansion.gameOver).toBeNull()

    const base = selectPublicView(created(5))
    expect(base.expansion).toBeNull()
    expect('enactedCommunist' in base).toBe(false)
    expect('confessions' in base).toBe(false)
  })

  it('keeps every 5-10 model free of the word communist', () => {
    expect(JSON.stringify(selectPublicView(created(5)))).not.toContain('communist')

    let state = revealed(5)
    state = act(state, { type: 'nominate', playerId: eligibleId(state) })
    state = act(state, { type: 'vote', approved: true })
    state = act(state, { type: 'presidentDiscard', index: 0 })
    expect(state.phase).toBe('legislativeChancellor')
    expect(JSON.stringify(selectPublicView(state))).not.toContain('communist')

    const over = enact(created(5), 'liberal', { liberal: 4 })
    expect(over.phase).toBe('gameOver')
    expect(JSON.stringify(selectPublicView(over))).not.toContain('communist')
  })
})

describe('public view privacy at every phase', () => {
  for (const [label, build] of phases) {
    it(`hides private data at ${label}`, () => {
      assertView(build())
    })
  }
})

describe('secret steps and the public record', () => {
  it('keeps the Radicalisation target and result out of the picker and reveal views', () => {
    const pick = radicalisePick()
    assertSafeView(selectPublicView(pick))

    const reveal = radicaliseReveal()
    const radicalisation = reveal.radicalisation!
    expect(radicalisation.revealIndex).toBeGreaterThan(0)
    expect(reveal.players.find((p) => p.id === radicalisation.targetId)!.party).toBe('communist')
    const json = JSON.stringify(selectPublicView(reveal))
    expect(json).not.toContain('"fascist"')
    expect(json).not.toContain('"radicalisation"')
    assertView(reveal)

    const done = radicaliseDone()
    expect(done.radicalisation!.revealIndex).toBe(livingPlayers(done).length)
    assertView(done)
  })

  it('does not publish a pending confession party before acknowledgement', () => {
    const pending = confessionPending()
    expect(pending.confession).toEqual({ playerId: pending.presidentId, party: 'liberal' })

    const view = selectPublicView(pending)
    expect(view.pendingActionType).toBe('confession')
    const json = JSON.stringify(view)
    expect(json).not.toContain('liberal')
    expect(json).not.toContain('"party"')
    assertView(pending)
  })

  it('publishes the committed confession record as the only party occurrence', () => {
    const pending = confessionPending()
    const acked = act(pending, { type: 'acknowledgeConfession' })
    const view = selectPublicView(acked)
    expect(view.confessions).toEqual([
      { playerId: pending.confession!.playerId, party: 'liberal', round: pending.round },
    ])
    assertView(acked)
  })

  it('shows only the grown deck count for the Five-Year Plan', () => {
    const pending = fiveYearPlanPending()
    const view = selectPublicView(pending)
    expect(view.pendingActionType).toBe('fiveYearPlan')
    expect(view.deckCount).toBe(26)
    assertView(pending)
  })

  it('names every winner set in game over without leaking roles', () => {
    expect(selectPublicView(enact(revealed(5), 'liberal', { liberal: 4 })).gameOver).toEqual({
      winners: ['liberal'],
      reason: 'liberalPolicies',
    })
    expect(selectPublicView(enact(revealed(5), 'fascist', { fascist: 5 })).gameOver).toEqual({
      winners: ['fascist'],
      reason: 'fascistPolicies',
    })
    expect(
      selectPublicView(enact(revealed(11), 'communist', { communist: 5 })).gameOver,
    ).toEqual({ winners: ['communist'], reason: 'communistPolicies' })
    expect(selectPublicView(hitlerExecution(5)).gameOver).toEqual({
      winners: ['liberal'],
      reason: 'hitlerExecuted',
    })
    expect(selectPublicView(hitlerExecution(11)).gameOver).toEqual({
      winners: ['liberal', 'communist'],
      reason: 'hitlerExecuted',
    })
  })
})

describe('scanner is not vacuous', () => {
  const view = () => selectPublicView(revealed(11))
  const pollute = (extra: Record<string, unknown>) => ({ ...view(), ...extra }) as unknown as PublicView

  it('rejects an injected role', () => {
    expect(() => assertSafeView(pollute({ role: 'hitler' }))).toThrow(/forbidden key role/)
  })

  it('rejects an injected radicalisation target', () => {
    expect(() =>
      assertSafeView(
        pollute({ radicalisation: { targetId: 0, before: 'liberal', after: 'communist', revealIndex: 3 } }),
      ),
    ).toThrow(/forbidden key radicalisation/)
  })

  it('rejects a party added to a public player', () => {
    const v = view()
    const players = v.players.map((player, index) =>
      index === 0 ? { ...player, party: 'liberal' } : player,
    )
    expect(() => assertSafeView({ ...v, players } as unknown as PublicView)).toThrow(
      /forbidden key party/,
    )
  })

  it('rejects a party-like value under an innocuous key', () => {
    expect(() => assertSafeView(pollute({ debug: 'communist' }))).toThrow(/party-like value/)
  })

  it('rejects an extra winner field', () => {
    expect(() =>
      assertSafeView(pollute({ gameOver: { winners: ['liberal'], reason: 'liberalPolicies', role: 'x' } })),
    ).toThrow(/forbidden key role/)
  })
})
