import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { GAME_KEY, parseSave, useGameStore } from './game'
import { storage } from '../platform/storage'

const names = ['A', 'B', 'C', 'D', 'E']

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
    expect(parsed.state.schemaVersion).toBe(1)
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
