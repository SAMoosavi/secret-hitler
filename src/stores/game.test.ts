import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GAME_KEY, parseSave, useGameStore } from './game'
import { storage } from '../platform/storage'
import fixture from './fixtures/v1-save.json'
import { createGame, livingPlayers, transition } from '../game/engine'
import {
  COMMUNIST_TRACK,
  FASCIST_TRACK,
  LIBERAL_TRACK,
  partyForRole,
  ROLE_TABLE,
} from '../game/constants'
import { seededRng } from '../game/rng'
import type { GameState, Party, Role, WinReason, Winner } from '../game/types'

const names = ['A', 'B', 'C', 'D', 'E']
const wideNames = Array.from({ length: 13 }, (_, i) => `Player ${i + 1}`)

/** A raw parsed save, mutable so tests can corrupt one field at a time. */
type Raw = Record<string, any>

function rawOf(state: GameState | object): Raw {
  return JSON.parse(JSON.stringify(state)) as Raw
}

function created(count: number, seed = 7): GameState {
  const result = createGame(
    { playerCount: count, names: wideNames.slice(0, count) },
    seededRng(seed),
  )
  if (!result.ok) throw new Error(result.error.code)
  return result.state
}

function parsedFixture(): GameState {
  const parsed = parseSave(JSON.stringify(fixture))
  if ('error' in parsed) throw new Error(parsed.error)
  return parsed.state
}

function expectCorrupt(raw: Raw): void {
  expect(() => parseSave(JSON.stringify(raw))).not.toThrow()
  expect(parseSave(JSON.stringify(raw))).toEqual({ error: 'corrupt' })
}

async function newStore() {
  setActivePinia(createPinia())
  const store = useGameStore()
  await store.init()
  return store
}

describe('game persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('writes after starting and restores the exact state', async () => {
    const store = await newStore()
    expect(await store.startGame({ playerCount: 5, names })).toBe(true)
    expect(store.state?.phase).toBe('roleReveal')
    expect(localStorage.getItem(GAME_KEY)).toBeTruthy()

    const saved = store.state!
    const reloaded = await newStore()
    expect(reloaded.resumeAvailable).toBe(true)
    expect(reloaded.restored).toBe(true)
    reloaded.acknowledgeRestore()
    expect(reloaded.restored).toBe(false)
    expect(reloaded.state).toEqual(saved)
    expect(reloaded.publicView?.players).toHaveLength(5)
  })

  it('persists every reveal and moves to nomination', async () => {
    const store = await newStore()
    await store.startGame({ playerCount: 5, names })
    for (let i = 0; i < 5; i++) {
      expect(await store.commit({ type: 'nextReveal' })).toBe(true)
    }
    expect(store.state?.phase).toBe('nomination')
    const saved = JSON.parse(localStorage.getItem(GAME_KEY)!)
    expect(saved.phase).toBe('nomination')
  })

  it('leaves state unchanged when a transition is invalid', async () => {
    const store = await newStore()
    await store.startGame({ playerCount: 5, names })
    for (let i = 0; i < 5; i++) await store.commit({ type: 'nextReveal' })
    const before = store.state
    expect(await store.commit({ type: 'nominate', playerId: store.state!.presidentId })).toBe(false)
    expect(store.state).toBe(before)
    expect(store.lastError?.code).toBe('selfNomination')
  })

  it('does not swap state when the save fails', async () => {
    const store = await newStore()
    await store.startGame({ playerCount: 5, names })
    const before = store.state
    vi.spyOn(storage, 'set').mockRejectedValueOnce(new Error('disk full'))
    expect(await store.commit({ type: 'nextReveal' })).toBe(false)
    expect(store.state).toBe(before)
    expect(store.saveError).toBe('errors.saveFailed')
  })

  it('guards against duplicate submissions while a save is in flight', async () => {
    const store = await newStore()
    await store.startGame({ playerCount: 5, names })
    let release: () => void = () => {}
    vi.spyOn(storage, 'set').mockImplementationOnce(
      () => new Promise<void>((resolve) => (release = resolve)),
    )
    const first = store.commit({ type: 'nextReveal' })
    const second = await store.commit({ type: 'nextReveal' })
    expect(second).toBe(false)
    release()
    expect(await first).toBe(true)
  })

  it('deletes the saved game', async () => {
    const store = await newStore()
    await store.startGame({ playerCount: 5, names })
    await store.discardGame()
    expect(store.state).toBeNull()
    expect(store.hasSave).toBe(false)
    expect(localStorage.getItem(GAME_KEY)).toBeNull()
  })
})

describe('save parsing', () => {
  it('refuses a newer schema and offers a new game instead of crashing', () => {
    expect(parseSave('{"schemaVersion": 99}')).toEqual({ error: 'tooNew' })
  })

  it('reports corrupt JSON and missing fields', () => {
    expect(parseSave('not json')).toEqual({ error: 'corrupt' })
    expect(parseSave('{"schemaVersion":1,"phase":"nomination"}')).toEqual({ error: 'corrupt' })
  })

  it('migrates a v0 draft save by filling the new fields', async () => {
    const store = await newStore()
    await store.startGame({ playerCount: 5, names })
    const raw = JSON.parse(localStorage.getItem(GAME_KEY)!)
    delete raw.schemaVersion
    delete raw.investigated
    delete raw.revealIndex
    const parsed = parseSave(JSON.stringify(raw))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.schemaVersion).toBe(2)
    expect(parsed.state.investigated).toEqual([])
    expect(parsed.state.revealIndex).toBe(0)
  })

  it('treats a phase without its required data as corrupt', async () => {
    const store = await newStore()
    await store.startGame({ playerCount: 5, names })
    const raw = JSON.parse(localStorage.getItem(GAME_KEY)!)

    expect(parseSave(JSON.stringify({ ...raw, phase: 'executive', pendingAction: null }))).toEqual({
      error: 'corrupt',
    })
    expect(
      parseSave(JSON.stringify({ ...raw, phase: 'legislativeChancellor', legislative: null })),
    ).toEqual({ error: 'corrupt' })
    expect(parseSave(JSON.stringify({ ...raw, phase: 'gameOver', gameOver: null }))).toEqual({
      error: 'corrupt',
    })
  })

  it('surfaces a readable load error for a newer save', async () => {
    localStorage.setItem(GAME_KEY, '{"schemaVersion":9}')
    const store = await newStore()
    expect(store.loadError).toBe('tooNew')
    expect(store.resumeAvailable).toBe(false)
    await store.discardGame()
    expect(store.loadError).toBeNull()
  })
})

describe('v1 fixture migration', () => {
  it('loads the fixed v1 save, deriving parties and mapping the old winner', () => {
    const raw = rawOf(fixture)
    expect(raw.schemaVersion).toBe(1)
    expect(raw.players).toHaveLength(5)
    for (const player of raw.players as Raw[]) {
      expect(player.role).toBeDefined()
      expect(player).not.toHaveProperty('party')
    }
    for (const key of ['expansion', 'enactedCommunist', 'confessions', 'radicalisation', 'confession']) {
      expect(raw).not.toHaveProperty(key)
    }
    expect(raw.gameOver).toBeNull()

    const state = parsedFixture()
    expect(state.schemaVersion).toBe(2)
    expect(state.playerCount).toBe(5)
    expect(state.expansion).toBeNull()
    expect(state.players.map((player) => player.party)).toEqual([
      'liberal',
      'fascist',
      'liberal',
      'fascist',
      'liberal',
    ])
    for (const player of state.players) {
      expect(player.party).toBe(partyForRole(player.role))
    }
    // v1's absent game is preserved; winner mapping is covered below.
    expect(state.gameOver).toBeNull()
    // Every v2 field is defaulted.
    expect(state.enactedCommunist).toBe(0)
    expect(state.confessions).toEqual([])
    expect(state.radicalisation).toBeNull()
    expect(state.confession).toBeNull()
  })

  it('maps a v1 single winner to a one-element winner set', () => {
    const raw = rawOf(fixture)
    raw.phase = 'gameOver'
    raw.gameOver = { winner: 'liberal', reason: 'liberalPolicies' }
    const parsed = parseSave(JSON.stringify(raw))
    if ('error' in parsed) throw new Error(parsed.error)
    expect(parsed.state.gameOver).toEqual({ winners: ['liberal'], reason: 'liberalPolicies' })
  })

  it('is playable from its phase and survives a store reload', async () => {
    localStorage.clear()
    const state = parsedFixture()
    const next = transition(state, { type: 'nominate', playerId: 1 }, seededRng(1))
    expect(next.ok).toBe(true)
    if (!next.ok) return
    expect(next.state.phase).toBe('voting')
    expect(next.state.nomineeId).toBe(1)

    localStorage.setItem(GAME_KEY, JSON.stringify(fixture))
    const store = await newStore()
    expect(store.loadError).toBeNull()
    expect(store.resumeAvailable).toBe(true)
    expect(store.state?.schemaVersion).toBe(2)
    expect(store.state?.players.map((player) => player.party)).toEqual(
      state.players.map((player) => player.party),
    )
  })

  it('chains a v0 save through v1 to v2', () => {
    const raw = rawOf(fixture)
    for (const key of [
      'schemaVersion',
      'id',
      'createdAt',
      'lastElection',
      'lastPresidentId',
      'lastChancellorId',
      'revealIndex',
      'legislative',
      'pendingAction',
      'peeked',
      'investigation',
      'investigated',
      'vetoUnlocked',
      'specialReturnId',
      'round',
      'tracker',
    ]) {
      delete raw[key]
    }

    const parsed = parseSave(JSON.stringify(raw))
    if ('error' in parsed) throw new Error(parsed.error)
    const state = parsed.state
    expect(state.schemaVersion).toBe(2)
    expect(state.id).toMatch(/^legacy-/)
    expect(typeof state.createdAt).toBe('number')
    for (const player of state.players) {
      expect(player.party).toBe(partyForRole(player.role))
    }
    expect(state.gameOver).toBeNull()
    expect(state.expansion).toBeNull()
    expect(state.enactedCommunist).toBe(0)
    expect(state.confessions).toEqual([])
    expect(state.radicalisation).toBeNull()
    expect(state.confession).toBeNull()
    expect(state.investigated).toEqual([])
    expect(state.revealIndex).toBe(0)
    expect(state.legislative).toBeNull()
    expect(state.pendingAction).toBeNull()
    expect(state.peeked).toBeNull()
    expect(state.investigation).toBeNull()
    expect(state.vetoUnlocked).toBe(false)
    expect(state.specialReturnId).toBeNull()
    expect(state.round).toBe(1)
    expect(state.tracker).toBe(0)
  })
})

describe('v2 expansion saves', () => {
  it('parses every supported player count with the official role table', () => {
    expect(ROLE_TABLE[11]).toEqual({ liberal: 5, fascist: 3, communist: 2, hitler: 1 })
    expect(ROLE_TABLE[12]).toEqual({ liberal: 6, fascist: 3, communist: 2, hitler: 1 })
    expect(ROLE_TABLE[13]).toEqual({ liberal: 6, fascist: 3, communist: 3, hitler: 1 })
    for (const count of [5, 6, 7, 8, 9, 10, 11, 12, 13]) {
      const state = created(count)
      const parsed = parseSave(JSON.stringify(state))
      if ('error' in parsed) throw new Error(`${count}: ${parsed.error}`)
      expect(parsed.state.players).toHaveLength(count)
      expect(parsed.state.expansion).toBe(count >= 11 ? 'communist' : null)
      const tally: Record<Role, number> = { liberal: 0, fascist: 0, communist: 0, hitler: 0 }
      for (const player of parsed.state.players) {
        tally[player.role] += 1
        expect(player.party).toBe(partyForRole(player.role))
      }
      const table = ROLE_TABLE[count]
      expect(tally).toEqual({
        liberal: table.liberal,
        fascist: table.fascist,
        communist: table.communist ?? 0,
        hitler: 1,
      })
    }
  })

  it('accepts valid saves in every resumable phase', () => {
    const base = created(12)
    const president = base.players.find((player) => player.id === base.presidentId)!
    const states: GameState[] = [
      {
        ...base,
        phase: 'legislativePresident',
        legislative: {
          presidentHand: ['communist', 'liberal', 'fascist'],
          chancellorHand: [],
          presidentDiscard: null,
          vetoRequested: false,
        },
      },
      {
        ...base,
        phase: 'legislativeChancellor',
        legislative: {
          presidentHand: [],
          chancellorHand: ['communist', 'liberal'],
          presidentDiscard: 'fascist',
          vetoRequested: true,
        },
      },
      {
        ...base,
        phase: 'executive',
        pendingAction: { type: 'investigate', actorId: base.presidentId },
      },
      {
        ...base,
        phase: 'executive',
        pendingAction: { type: 'peek', actorId: base.presidentId },
        peeked: ['communist', 'liberal', 'fascist'],
      },
      {
        ...base,
        phase: 'communistPower',
        pendingAction: { type: 'radicalise', actorId: base.presidentId },
      },
      {
        ...base,
        phase: 'communistPower',
        pendingAction: { type: 'fiveYearPlan', actorId: base.presidentId },
      },
      {
        ...base,
        phase: 'communistPower',
        pendingAction: { type: 'confession', actorId: base.presidentId },
        confession: { playerId: base.presidentId, party: president.party },
      },
      {
        ...base,
        phase: 'gameOver',
        gameOver: { winners: ['communist'], reason: 'communistPolicies' },
        enactedCommunist: 6,
      },
      {
        ...base,
        phase: 'gameOver',
        gameOver: { winners: ['liberal', 'communist'], reason: 'hitlerExecuted' },
        players: base.players.map((player) =>
          player.role === 'hitler' ? { ...player, alive: false } : player,
        ),
      },
    ]
    for (const state of states) {
      const parsed = parseSave(JSON.stringify(state))
      if ('error' in parsed) throw new Error(`${state.phase}: ${parsed.error}`)
      expect(parsed.state.phase).toBe(state.phase)
    }
  })

  it('round-trips a radicalisation reveal with a converted player, then finishes without duplicating', () => {
    const base = created(13)
    const target = base.players.find((player) => player.role === 'liberal')!
    const witness = base.players.find(
      (player) => player.role === 'liberal' && player.id !== target.id,
    )!
    const communistsBefore = base.players.filter((player) => player.party === 'communist').length
    const reveal: GameState = {
      ...base,
      phase: 'radicalisationReveal',
      round: 5,
      enactedLiberal: 2,
      enactedFascist: 1,
      enactedCommunist: 2,
      confessions: [{ playerId: witness.id, party: 'liberal', round: 3 }],
      players: base.players.map((player) =>
        player.id === target.id ? { ...player, party: 'communist' } : player,
      ),
      radicalisation: {
        targetId: target.id,
        before: 'liberal',
        after: 'communist',
        revealIndex: 4,
      },
    }
    expect(
      reveal.players.filter((player) => player.party === 'communist'),
    ).toHaveLength(communistsBefore + 1)

    const parsed = parseSave(JSON.stringify(reveal))
    if ('error' in parsed) throw new Error(parsed.error)
    // Every persisted field is restored exactly.
    expect(parsed.state).toEqual(reveal)

    let resumed = parsed.state
    while (resumed.radicalisation!.revealIndex < livingPlayers(resumed).length) {
      const step = transition(resumed, { type: 'nextRadicalisationReveal' }, seededRng(2))
      if (!step.ok) throw new Error(step.error.code)
      resumed = step.state
    }
    const finished = transition(resumed, { type: 'finishRadicalisation' }, seededRng(3))
    if (!finished.ok) throw new Error(finished.error.code)
    expect(finished.state.phase).toBe('nomination')
    expect(finished.state.radicalisation).toBeNull()
    expect(finished.state.pendingAction).toBeNull()

    const communistIds = finished.state.players
      .filter((player) => player.party === 'communist')
      .map((player) => player.id)
    expect(communistIds).toHaveLength(communistsBefore + 1)
    expect(new Set(communistIds).size).toBe(communistIds.length)
    expect(communistIds.filter((id) => id === target.id)).toHaveLength(1)
    expect(finished.state.players.find((player) => player.id === target.id)?.role).toBe('liberal')
  })
})

describe('save validation', () => {
  it('refuses schema version 3 and newer', () => {
    for (const schemaVersion of [3, 99]) {
      expect(parseSave(JSON.stringify({ schemaVersion }))).toEqual({ error: 'tooNew' })
    }
  })

  it('rejects illegal role/party pairs but accepts conversions', () => {
    const state = created(13)
    const illegal: Array<[Role, Party]> = [
      ['liberal', 'fascist'],
      ['fascist', 'liberal'],
      ['hitler', 'communist'],
      ['communist', 'liberal'],
    ]
    for (const [role, party] of illegal) {
      const raw = rawOf(state)
      const player = (raw.players as Raw[]).find((entry) => entry.role === role)!
      player.party = party
      expectCorrupt(raw)
    }
    for (const [role, party] of [
      ['liberal', 'communist'],
      ['fascist', 'communist'],
    ] as Array<[Role, Party]>) {
      const raw = rawOf(state)
      const player = (raw.players as Raw[]).find((entry) => entry.role === role)!
      player.party = party
      const parsed = parseSave(JSON.stringify(raw))
      expect('state' in parsed).toBe(true)
    }
  })

  it('rejects a role distribution that differs from the table', () => {
    const expansion = rawOf(created(13))
    const liberal = (expansion.players as Raw[]).find((player) => player.role === 'liberal')!
    liberal.role = 'fascist'
    liberal.party = 'fascist'
    expectCorrupt(expansion)

    const base = rawOf(parsedFixture())
    const baseLiberal = (base.players as Raw[]).find((player) => player.role === 'liberal')!
    baseLiberal.role = 'fascist'
    baseLiberal.party = 'fascist'
    expectCorrupt(base)

    const extraHitler = rawOf(created(11))
    const hitler = (extraHitler.players as Raw[]).find((player) => player.role === 'liberal')!
    hitler.role = 'hitler'
    hitler.party = 'fascist'
    expectCorrupt(extraHitler)
  })

  it('accepts only the exact winners for each ending', () => {
    const base = rawOf(parsedFixture())
    const expansion = rawOf(created(11))
    const withOver = (raw: Raw, winners: Winner[], reason: WinReason): Raw => ({
      ...raw,
      phase: 'gameOver',
      gameOver: { winners, reason },
    })

    for (const raw of [
      withOver(base, ['liberal'], 'liberalPolicies'),
      withOver(base, ['fascist'], 'fascistPolicies'),
      withOver(base, ['fascist'], 'hitlerElected'),
      withOver(base, ['liberal'], 'hitlerExecuted'),
      withOver(expansion, ['liberal'], 'liberalPolicies'),
      withOver(expansion, ['fascist'], 'fascistPolicies'),
      withOver(expansion, ['fascist'], 'hitlerElected'),
      withOver(expansion, ['liberal', 'communist'], 'hitlerExecuted'),
      withOver(expansion, ['communist'], 'communistPolicies'),
    ]) {
      const parsed = parseSave(JSON.stringify(raw))
      expect('state' in parsed).toBe(true)
    }

    for (const raw of [
      withOver(base, ['liberal', 'communist'], 'hitlerExecuted'),
      withOver(base, ['communist'], 'communistPolicies'),
      withOver(expansion, ['liberal'], 'hitlerExecuted'),
      withOver(expansion, ['fascist'], 'communistPolicies'),
      withOver(expansion, ['liberal', 'communist'], 'liberalPolicies'),
      withOver(expansion, ['liberal', 'liberal'], 'liberalPolicies'),
      withOver(base, ['liberal', 'fascist'], 'liberalPolicies'),
      withOver(base, [], 'liberalPolicies'),
      withOver(expansion, ['liberal', 'communist', 'fascist'], 'hitlerExecuted'),
      { ...base, phase: 'gameOver', gameOver: { winners: ['liberal'], reason: 'unknown' } },
      { ...base, phase: 'nomination', gameOver: { winners: ['liberal'], reason: 'liberalPolicies' } },
    ]) {
      expectCorrupt(raw)
    }
  })

  it('rejects a full policy track unless the game is over', () => {
    const base = rawOf(parsedFixture())
    const expansion = rawOf(created(11))

    const running: Array<[Raw, string, number]> = [
      [base, 'enactedLiberal', LIBERAL_TRACK],
      [base, 'enactedFascist', FASCIST_TRACK],
      [expansion, 'enactedCommunist', COMMUNIST_TRACK],
    ]
    for (const [raw, field, value] of running) {
      const save: Raw = { ...raw, phase: 'nomination' }
      save[field] = value
      expectCorrupt(save)
    }

    const endings: Raw[] = [
      {
        ...base,
        phase: 'gameOver',
        enactedLiberal: LIBERAL_TRACK,
        gameOver: { winners: ['liberal'], reason: 'liberalPolicies' },
      },
      {
        ...base,
        phase: 'gameOver',
        enactedFascist: FASCIST_TRACK,
        gameOver: { winners: ['fascist'], reason: 'fascistPolicies' },
      },
      {
        ...expansion,
        phase: 'gameOver',
        enactedCommunist: COMMUNIST_TRACK,
        gameOver: { winners: ['communist'], reason: 'communistPolicies' },
      },
    ]
    for (const raw of endings) {
      expect('state' in parseSave(JSON.stringify(raw))).toBe(true)
    }
  })

  it('rejects pending actions outside the phase that resolves them', () => {
    const state = created(13)
    const presidentId = state.presidentId
    const cases: Raw[] = []

    const nomination = rawOf(state)
    nomination.pendingAction = { type: 'investigate', actorId: presidentId }
    cases.push(nomination)

    const executiveCommunist = rawOf(state)
    executiveCommunist.phase = 'executive'
    executiveCommunist.pendingAction = { type: 'radicalise', actorId: presidentId }
    cases.push(executiveCommunist)

    const executiveNone = rawOf(state)
    executiveNone.phase = 'executive'
    executiveNone.pendingAction = { type: 'none', actorId: presidentId }
    cases.push(executiveNone)

    const communistBase = rawOf(state)
    communistBase.phase = 'communistPower'
    communistBase.pendingAction = { type: 'investigate', actorId: presidentId }
    cases.push(communistBase)

    const executiveNull = rawOf(state)
    executiveNull.phase = 'executive'
    executiveNull.pendingAction = null
    cases.push(executiveNull)

    const communistNull = rawOf(state)
    communistNull.phase = 'communistPower'
    communistNull.pendingAction = null
    cases.push(communistNull)

    const unknownActor = rawOf(state)
    unknownActor.phase = 'executive'
    unknownActor.pendingAction = { type: 'investigate', actorId: 99 }
    cases.push(unknownActor)

    for (const raw of cases) expectCorrupt(raw)
  })

  it('rejects a malformed or misplaced confession snapshot', () => {
    const state = created(11)
    const presidentId = state.presidentId
    const president = state.players.find((player) => player.id === presidentId)!
    const pendingConfession = (): Raw => {
      const raw = rawOf(state)
      raw.phase = 'communistPower'
      raw.pendingAction = { type: 'confession', actorId: presidentId }
      raw.confession = { playerId: presidentId, party: president.party }
      return raw
    }

    const missing = pendingConfession()
    missing.confession = null
    expectCorrupt(missing)

    const mismatch = pendingConfession()
    mismatch.confession = { playerId: presidentId === 0 ? 1 : 0, party: president.party }
    expectCorrupt(mismatch)

    const illegalParty = pendingConfession()
    illegalParty.confession = { playerId: presidentId, party: 'monarchist' }
    expectCorrupt(illegalParty)

    for (const type of ['radicalise', 'fiveYearPlan']) {
      const misplaced = pendingConfession()
      misplaced.pendingAction = { type, actorId: presidentId }
      expectCorrupt(misplaced)
    }

    const nomination = pendingConfession()
    nomination.phase = 'nomination'
    nomination.pendingAction = null
    expectCorrupt(nomination)

    const notPending = pendingConfession()
    notPending.pendingAction = null
    expectCorrupt(notPending)
  })

  it('rejects a malformed or misplaced radicalisation state', () => {
    const base = created(13)
    const target = base.players.find((player) => player.role === 'liberal')!
    const validReveal = (): Raw => {
      const raw = rawOf(base)
      raw.phase = 'radicalisationReveal'
      raw.players[target.id].party = 'communist'
      raw.radicalisation = {
        targetId: target.id,
        before: 'liberal',
        after: 'communist',
        revealIndex: 2,
      }
      return raw
    }
    expect('state' in parseSave(JSON.stringify(validReveal()))).toBe(true)
    expectCorrupt({ ...rawOf(base), phase: 'radicalisationReveal', radicalisation: null })

    const wrongPhase = validReveal()
    wrongPhase.phase = 'nomination'
    expectCorrupt(wrongPhase)

    for (const revealIndex of [-1, 14, 1.5]) {
      const raw = validReveal()
      raw.radicalisation.revealIndex = revealIndex
      expectCorrupt(raw)
    }

    const deadTarget = validReveal()
    deadTarget.players[target.id].alive = false
    expectCorrupt(deadTarget)

    const missingTarget = validReveal()
    missingTarget.radicalisation.targetId = 99
    expectCorrupt(missingTarget)

    const illegalAfter = validReveal()
    illegalAfter.radicalisation.after = 'liberal'
    expectCorrupt(illegalAfter)

    const partyMismatch = validReveal()
    partyMismatch.players[target.id].party = 'liberal'
    expectCorrupt(partyMismatch)

    const hitler = base.players.find((player) => player.role === 'hitler')!
    const hitlerTarget = rawOf(base)
    hitlerTarget.phase = 'radicalisationReveal'
    hitlerTarget.players[hitler.id].party = 'communist'
    hitlerTarget.radicalisation = {
      targetId: hitler.id,
      before: 'fascist',
      after: 'communist',
      revealIndex: 0,
    }
    expectCorrupt(hitlerTarget)

    const pendingReveal = validReveal()
    pendingReveal.pendingAction = { type: 'radicalise', actorId: base.presidentId }
    expectCorrupt(pendingReveal)

    const baseReveal = rawOf(parsedFixture())
    baseReveal.phase = 'radicalisationReveal'
    baseReveal.radicalisation = {
      targetId: 0,
      before: 'liberal',
      after: 'communist',
      revealIndex: 0,
    }
    expectCorrupt(baseReveal)
  })

  it('rejects Communist content in a 5-10 save', () => {
    const base = rawOf(parsedFixture())

    const deck = rawOf(base)
    deck.deck[0] = 'communist'
    expectCorrupt(deck)

    const discard = rawOf(base)
    discard.discard = ['communist']
    expectCorrupt(discard)

    const peeked = rawOf(base)
    peeked.peeked = ['communist']
    expectCorrupt(peeked)

    const investigation = rawOf(base)
    investigation.investigation = { playerId: 0, party: 'communist' }
    expectCorrupt(investigation)

    const hands = rawOf(base)
    hands.phase = 'legislativeChancellor'
    hands.legislative = {
      presidentHand: [],
      chancellorHand: ['communist', 'liberal'],
      presidentDiscard: 'fascist',
      vetoRequested: false,
    }
    expectCorrupt(hands)

    const track = rawOf(base)
    track.enactedCommunist = 1
    expectCorrupt(track)

    const history = rawOf(base)
    history.confessions = [{ playerId: 0, party: 'liberal', round: 1 }]
    expectCorrupt(history)

    const expansion = rawOf(base)
    expansion.expansion = 'communist'
    expectCorrupt(expansion)

    const role = rawOf(base)
    role.players[0].role = 'communist'
    role.players[0].party = 'communist'
    expectCorrupt(role)
  })

  it('never throws and always returns an error for malformed input', () => {
    const inputs: string[] = [
      'null',
      '0',
      '"text"',
      '[]',
      '{}',
      '{"schemaVersion":2}',
      '{"schemaVersion":3}',
      '{"schemaVersion":2,"players":[]}',
      JSON.stringify({ schemaVersion: 2, players: [null, null, null, null, null] }),
      JSON.stringify({
        schemaVersion: 2,
        players: Array.from({ length: 5 }, () => ({})),
        phase: 'nomination',
      }),
      JSON.stringify({
        schemaVersion: 2,
        players: Array.from({ length: 5 }, (_, id) => ({
          id,
          name: 'x',
          role: 'liberal',
          party: 'liberal',
          alive: true,
        })),
      }),
      JSON.stringify({ ...rawOf(created(5)), players: 'nope' }),
      JSON.stringify({ ...rawOf(created(5)), gameOver: { winners: ['liberal'], reason: 42 } }),
      JSON.stringify({ ...rawOf(created(5)), confessions: 'nope' }),
      JSON.stringify({ ...rawOf(created(5)), radicalisation: 7 }),
      JSON.stringify({ ...rawOf(created(5)), confession: 'nope' }),
    ]
    for (const input of inputs) {
      expect(() => parseSave(input)).not.toThrow()
      const parsed = parseSave(input)
      expect('error' in parsed).toBe(true)
    }
  })
})
