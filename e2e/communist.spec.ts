import { expect, test, type Locator, type Page } from '@playwright/test'
import { createGame as createEngineGame } from '../src/game/engine'
import { partyForRole } from '../src/game/constants'
import { makeDeck } from '../src/game/deck'
import { seededRng } from '../src/game/rng'
import type { GameState, Policy, Role } from '../src/game/types'
import { WIDE_NAMES, confirmWith } from './helpers'

// Roles are fixed per fixture so every count still matches the official table.
const ROLES_5: Role[] = ['liberal', 'hitler', 'fascist', 'liberal', 'liberal']
const ROLES_11: Role[] = [
  'communist', 'liberal', 'fascist', 'liberal', 'liberal', 'communist',
  'hitler', 'fascist', 'liberal', 'fascist', 'liberal',
]
const ROLES_13: Role[] = [
  'communist', 'communist', 'communist', 'hitler', 'fascist', 'fascist', 'fascist',
  'liberal', 'liberal', 'liberal', 'liberal', 'liberal', 'liberal',
]
const NAMES_11 = WIDE_NAMES.slice(0, 11)

/** A legal save in the nomination phase with fixed roles and parties. */
function makeState(roles: Role[], overrides: Partial<GameState> = {}): GameState {
  const created = createEngineGame(
    { playerCount: roles.length, names: WIDE_NAMES.slice(0, roles.length) },
    seededRng(9),
  )
  if (!created.ok) throw new Error(created.error.code)
  return {
    ...created.state,
    phase: 'nomination',
    presidentId: 0,
    nomineeId: null,
    lastElection: null,
    lastPresidentId: null,
    lastChancellorId: null,
    enactedLiberal: 0,
    enactedFascist: 0,
    enactedCommunist: 0,
    discard: [],
    tracker: 0,
    round: 1,
    revealIndex: 0,
    legislative: null,
    pendingAction: null,
    peeked: null,
    investigation: null,
    investigated: [],
    vetoUnlocked: false,
    specialReturnId: null,
    confessions: [],
    radicalisation: null,
    confession: null,
    gameOver: null,
    players: created.state.players.map((player, index) => ({
      ...player,
      role: roles[index],
      party: partyForRole(roles[index]),
    })),
    ...overrides,
  }
}

function convert(state: GameState, playerId: number): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.id === playerId ? { ...player, party: 'communist' } : player,
    ),
  }
}

function radicalisePickState(): GameState {
  return makeState(ROLES_11, {
    phase: 'communistPower',
    presidentId: 3,
    round: 2,
    enactedCommunist: 1,
    pendingAction: { type: 'radicalise', actorId: 3 },
  })
}

function radicaliseRevealState(revealIndex = 3): GameState {
  return convert(
    makeState(ROLES_11, {
      phase: 'radicalisationReveal',
      presidentId: 3,
      round: 2,
      enactedCommunist: 1,
      radicalisation: { targetId: 2, before: 'fascist', after: 'communist', revealIndex },
    }),
    2,
  )
}

function confessionState(): GameState {
  return convert(
    makeState(ROLES_11, {
      phase: 'communistPower',
      presidentId: 3,
      round: 2,
      enactedCommunist: 4,
      pendingAction: { type: 'confession', actorId: 3 },
      // The snapshot says Liberal while Dan is now Communist: the screen must
      // show the snapshot, not the current party.
      confession: { playerId: 3, party: 'liberal' },
    }),
    3,
  )
}

function fiveYearPlanState(): GameState {
  return makeState(ROLES_11, {
    phase: 'communistPower',
    presidentId: 0,
    round: 3,
    enactedCommunist: 2,
    pendingAction: { type: 'fiveYearPlan', actorId: 0 },
    deck: [...makeDeck(11), 'communist', 'communist', 'liberal'] as Policy[],
  })
}

function board13State(): GameState {
  return makeState(ROLES_13, {
    phase: 'nomination',
    presidentId: 3,
    round: 3,
    enactedLiberal: 2,
    enactedFascist: 1,
    enactedCommunist: 2,
    confessions: [{ playerId: 0, party: 'communist', round: 2 }],
  })
}

function board5State(): GameState {
  return makeState(ROLES_5, { phase: 'nomination', presidentId: 0, round: 2 })
}

function communistWinState(): GameState {
  return makeState(ROLES_11, {
    phase: 'legislativeChancellor',
    presidentId: 0,
    lastChancellorId: 1,
    round: 4,
    enactedLiberal: 2,
    enactedFascist: 1,
    enactedCommunist: 5,
    legislative: {
      presidentHand: [],
      chancellorHand: ['communist', 'liberal'],
      presidentDiscard: 'fascist',
      vetoRequested: false,
    },
  })
}

function jointWinState(): GameState {
  return makeState(ROLES_11, {
    phase: 'executive',
    presidentId: 0,
    round: 4,
    enactedLiberal: 2,
    enactedFascist: 2,
    enactedCommunist: 1,
    pendingAction: { type: 'execute', actorId: 0 },
  })
}

function baseExecuteState(): GameState {
  return makeState(ROLES_5, {
    phase: 'executive',
    presidentId: 0,
    round: 2,
    enactedFascist: 1,
    pendingAction: { type: 'execute', actorId: 0 },
  })
}

function jointGameOverState(): GameState {
  return convert(
    makeState(ROLES_11, {
      phase: 'gameOver',
      presidentId: 0,
      round: 7,
      enactedLiberal: 3,
      enactedFascist: 2,
      enactedCommunist: 1,
      gameOver: { winners: ['liberal', 'communist'], reason: 'hitlerExecuted' },
    }),
    4,
  )
}

interface OpenOptions {
  settings?: Record<string, unknown>
  once?: boolean
  route?: string
}

/** Seeds a save before the app boots; `once` keeps reloads on the progressed save. */
async function seed(page: Page, state: GameState, options: OpenOptions = {}): Promise<void> {
  await page.addInitScript(
    (init) => {
      if (!init.once || !sessionStorage.getItem('e2e.seeded')) {
        localStorage.setItem('sh.game', JSON.stringify(init.state))
        if (init.once) sessionStorage.setItem('e2e.seeded', '1')
      }
      if (init.settings) {
        localStorage.setItem('sh.settings', JSON.stringify({ v: 2, settings: init.settings }))
      }
    },
    { state, settings: options.settings ?? null, once: options.once ?? false },
  )
  await page.goto(options.route ?? '/#/game')
}

async function openGame(page: Page, state: GameState, options: OpenOptions = {}): Promise<void> {
  await seed(page, state, options)
  await expect(page.locator('.privacy-cover')).toBeVisible()
}

async function passShield(page: Page): Promise<void> {
  const cover = page.locator('.privacy-cover')
  await expect(cover).toBeVisible()
  await cover.getByRole('button').click()
  await expect(cover).toHaveCount(0)
}

async function savedState(page: Page): Promise<GameState> {
  const raw = await page.evaluate(() => localStorage.getItem('sh.game'))
  if (!raw) throw new Error('missing save')
  return JSON.parse(raw) as GameState
}

async function openReveal(page: Page, roles: Role[]): Promise<void> {
  await seed(page, makeState(roles, { phase: 'roleReveal', revealIndex: 0 }), {
    route: '/#/reveal',
  })
  await expect(
    page.getByRole('heading', { name: `Pass the phone to ${WIDE_NAMES[0]}` }),
  ).toBeVisible()
}

function panelWith(page: Page, text: string): Locator {
  return page.locator('div.panel').filter({ has: page.getByText(text, { exact: true }) })
}

async function horizontalOverflow(page: Page, where: 'page' | 'dialog'): Promise<number> {
  if (where === 'page') {
    return page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
  }
  return page
    .locator('dialog[open] .dialog-card')
    .last()
    .evaluate((element) => element.scrollWidth - element.clientWidth)
}

async function expectNoHorizontalOverflow(page: Page, where: 'page' | 'dialog' = 'page'): Promise<void> {
  const overflow = await horizontalOverflow(page, where)
  expect(overflow, `${where} overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1)
}

async function expectFullyVisible(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded()
  await expect(locator).toBeInViewport({ ratio: 1 })
  const box = await locator.boundingBox()
  const width = page.viewportSize()!.width
  expect(box, 'control has no bounding box').not.toBeNull()
  expect(box!.x, 'control starts left of the viewport').toBeGreaterThanOrEqual(-1)
  expect(box!.x + box!.width, 'control ends right of the viewport').toBeLessThanOrEqual(width + 1)
}

async function expectRadicalisationCover(page: Page): Promise<void> {
  const cover = page.getByRole('dialog', { name: 'Everyone close your eyes' })
  await expect(cover).toContainText('Pass the phone to the President.')
  const text = await cover.innerText()
  expect(text).not.toMatch(/You are now a Communist|No change/)
  expect(text).not.toMatch(/\b(Liberal|Fascist|Communist)\b/)
  expect(text).not.toContain('Cara')
  await cover.getByRole('button', { name: 'The President has the phone' }).click()
}

async function expectPicker(page: Page): Promise<void> {
  const picker = page.getByRole('dialog', { name: 'Radicalisation' })
  await expect(picker).toContainText('Choose one living player. The result stays private.')
  const buttons = picker.getByRole('button')
  await expect(buttons).toHaveCount(NAMES_11.length)
  for (const name of NAMES_11) {
    await expect(
      picker.getByRole('button', { name: new RegExp(`^${name}( — |$)`) }),
    ).toBeVisible()
  }
  for (const button of await buttons.all()) {
    expect(await button.getAttribute('aria-disabled'), 'picker row must not be disabled').toBeNull()
  }
  await expect(picker.getByText('Term-limited')).toHaveCount(0)
  await expect(picker.getByText('Eliminated')).toHaveCount(0)
  // The picker must not hint at anyone's party, role or conversion.
  expect(await picker.innerText()).not.toMatch(/\b(Liberal|Fascist|Communist)\b/)
}

async function pickTarget(page: Page, name: string): Promise<void> {
  const picker = page.getByRole('dialog', { name: 'Radicalisation' })
  await picker.getByRole('button', { name: new RegExp(`^${name}( — |$)`) }).click()
  const confirm = page.getByRole('dialog', { name: `Radicalise ${name}?` })
  await expect(confirm).toContainText('This choice is final.')
  await confirm.getByRole('button', { name: `Radicalise ${name}` }).click()
  await expect(picker).toContainText(`Pass to ${NAMES_11[0]}`)
}

/** Walks every living player in seat order and checks the private screen. */
async function walkRadicalisation(page: Page, targetName: string, targetChanges: boolean): Promise<void> {
  for (const [index, name] of NAMES_11.entries()) {
    const dialog = page.getByRole('dialog', { name: 'Radicalisation' })
    await expect(dialog).toContainText(`Pass to ${name}`)

    const handoff = await dialog.innerText()
    expect(handoff, `result leaked before ${name} revealed`).not.toMatch(
      /You are now a Communist|No change/,
    )
    if (name !== targetName) {
      expect(handoff, `target name leaked on ${name}'s handoff`).not.toContain(targetName)
    }
    expect(handoff, `party leaked on ${name}'s handoff`).not.toMatch(
      /\b(Liberal|Fascist|Communist)\b/,
    )

    await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
    const revealed = await dialog.innerText()
    if (name === targetName && targetChanges) {
      expect(revealed).toContain('You are now a Communist')
      expect(revealed).not.toContain('No change')
    } else {
      expect(revealed).toContain('No change')
      expect(revealed).not.toContain('You are now a Communist')
      expect(revealed, `party leaked on ${name}'s result`).not.toMatch(/\bCommunist\b/)
    }

    await dialog.getByRole('button', { name: 'Hide and pass' }).click()
    if (index < NAMES_11.length - 1) {
      await expect(dialog).toContainText(`Pass to ${NAMES_11[index + 1]}`)
    } else {
      await expect(page.getByRole('dialog', { name: 'Radicalisation resolved' })).toBeVisible()
    }
    // The private result must be gone before the next player takes the phone.
    const dom = await page.locator('body').innerHTML()
    expect(dom, 'private result stayed in the DOM').not.toContain('You are now a Communist')
    expect(dom, 'private result stayed in the DOM').not.toContain('No change')
  }

  const resolved = page.getByRole('dialog', { name: 'Radicalisation resolved' })
  await expect(resolved).toContainText('The Communist track has advanced.')
  const text = await resolved.innerText()
  expect(text).not.toContain(targetName)
  expect(text).not.toMatch(/You are now a Communist|No change/)
  await resolved.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
}

test('13-player setup shows the Communist expansion, 23 tiles and no 14', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()

  const count13 = page.getByRole('button', {
    name: '13 players, Communist expansion',
  })
  await expect(count13).toBeVisible()
  await expect(page.getByRole('button', { name: /^14 players/ })).toHaveCount(0)
  await count13.click()
  await expect(count13).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('Fan expansion', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  for (const [index, name] of WIDE_NAMES.entries()) {
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name)
  }

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Role distribution' })).toBeVisible()
  for (const [label, count] of [
    ['Liberals', '6'],
    ['Fascists', '3'],
    ['Hitler', '1'],
    ['Communists', '3'],
  ] as const) {
    await expect(panelWith(page, label).first().locator('span.text-2xl')).toHaveText(count)
  }
  await expect(page.getByText('Communists know each other at 11+; Hitler does not know them.')).toBeVisible()

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Prepare the table' })).toBeVisible()
  await expect(page.getByText('8 Communist policy tiles', { exact: true })).toBeVisible()
  const tiles = page.locator('dl').first()
  for (const [label, count] of [
    ['liberal policy tiles', '5'],
    ['fascist policy tiles', '10'],
    ['tiles in the policy deck', '23'],
    ['tiles drawn each session', '3'],
  ] as const) {
    const tile = tiles.locator('div.panel').filter({ has: page.getByText(label, { exact: true }) })
    await expect(tile.locator('dd')).toHaveText(count)
  }
  const tracks = page.locator('dl').nth(1)
  for (const [label, count] of [
    ['Liberals', '5'],
    ['Fascists', '6'],
    ['Communist track', '6'],
  ] as const) {
    const row = tracks.locator('div.panel').filter({ has: page.getByText(label, { exact: true }) })
    await expect(row.locator('dd.text-xl, dd span.text-xl')).toHaveText(count)
  }
  await expect(page.getByText('Fascist board for 9–10 players', { exact: true })).toBeVisible()
  await expect(page.getByText('Six Communist policies win the game', { exact: true })).toBeVisible()
  await expect(
    page.getByText('Keep 2 spare Communist and 1 spare Liberal tile for Five-Year Plan', {
      exact: true,
    }),
  ).toBeVisible()
  const powers = page.locator('ol[aria-label="Communist track"] > li')
  await expect(powers).toHaveCount(6)
  for (const [index, label] of [
    'Blank',
    'Radicalisation',
    'Five-Year Plan',
    'Radicalisation',
    'Confession',
    'Victory',
  ].entries()) {
    await expect(powers.nth(index)).toContainText(label)
  }

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ready to begin?' })).toBeVisible()
  await expect(page.getByText('Communist expansion', { exact: true })).toBeVisible()
  await expect(page.getByText('13 players', { exact: true })).toBeVisible()
  await expect(page.getByText('Fascist board for 9–10 players', { exact: true })).toBeVisible()
  for (const [label, count] of [
    ['Liberals', '6'],
    ['Fascists', '3'],
    ['Hitler', '1'],
    ['Communists', '3'],
  ] as const) {
    const row = page.locator('dl > div').filter({ has: page.getByText(label, { exact: true }) })
    await expect(row.locator('dd')).toHaveText(count)
  }
})

test('the Communist role reveal shows party and only the other Communists', async ({ page }) => {
  await openReveal(page, ROLES_13)
  await page.getByRole('button', { name: /^I am Alice/ }).click()
  await expect(page.getByText('Your secret role')).toBeVisible()
  expect(await page.locator('main').innerText()).not.toMatch(/\b(Liberal|Fascist|Hitler|Communist)\b/)

  await page.getByRole('button', { name: 'Tap to reveal' }).click()
  const card = page.locator('.role-card-front')
  await expect(card.locator('h1')).toHaveText('Communist')
  await expect(card.locator('p')).toHaveText('Party: Communist')
  await expect(card).toHaveAttribute('aria-label', 'Communist role card. Party: Communist.')
  await expect(card).toHaveClass(/communist/)
  await expect(card.locator('svg')).toHaveCount(1)
  await expect(page.getByText('Communists: Bob, Cara', { exact: true })).toBeVisible()

  const main = await page.locator('main').innerText()
  expect(main).not.toMatch(/\b(Fascist|Hitler|Liberal)\b/)
  expect(main).not.toContain('Dan')
  expect(main).not.toContain('Eve')
  expect(main).not.toContain('Gus')
  expect(main).not.toContain('Hitler is')
  expect(main).not.toContain('The fascists are')
})

test('Hitler at 13 sees neither Fascists nor Communists', async ({ page }) => {
  const roles: Role[] = [
    'hitler', 'communist', 'communist', 'communist', 'fascist', 'fascist', 'fascist',
    'liberal', 'liberal', 'liberal', 'liberal', 'liberal', 'liberal',
  ]
  await openReveal(page, roles)
  await page.getByRole('button', { name: /^I am Alice/ }).click()
  await page.getByRole('button', { name: 'Tap to reveal' }).click()

  const card = page.locator('.role-card-front')
  await expect(card.locator('h1')).toHaveText('Hitler')
  await expect(card.locator('p')).toHaveText('Team Fascist')
  await expect(page.getByText('You do not know the Fascists or the Communists.', { exact: true })).toBeVisible()
  await expect(page.getByText(/Communists:/)).toHaveCount(0)
  await expect(page.getByText(/The fascists are/)).toHaveCount(0)
  await expect(page.getByText(/Hitler is/)).toHaveCount(0)
  const main = await page.locator('main').innerText()
  expect(main).not.toContain('Bob')
  expect(main).not.toContain('Cara')
  expect(main).not.toContain('Eve')
})

test('the 5-player role reveal stays unchanged without Communist content', async ({ page }) => {
  await openReveal(page, ROLES_5)
  await page.getByRole('button', { name: /^I am Alice/ }).click()
  await page.getByRole('button', { name: 'Tap to reveal' }).click()
  const card = page.locator('.role-card-front')
  await expect(card.locator('h1')).toHaveText('Liberal')
  await expect(card.locator('p')).toHaveText('Team Liberal')
  await expect(page.getByText('You do not know the other roles.', { exact: true })).toBeVisible()
  await expect(page.getByText(/Party:/)).toHaveCount(0)
  expect(await page.locator('main').innerText()).not.toMatch(/Communist/)

  await page.getByRole('button', { name: 'Hide role and pass on' }).click()
  await expect(page.getByRole('heading', { name: 'Pass the phone to Bob' })).toBeVisible()
  await page.getByRole('button', { name: /^I am Bob/ }).click()
  await page.getByRole('button', { name: 'Tap to reveal' }).click()
  await expect(page.locator('.role-card-front h1')).toHaveText('Hitler')
  await expect(page.locator('.role-card-front p')).toHaveText('Team Fascist')
  await expect(page.getByText('The fascists are Cara.', { exact: true })).toBeVisible()
})

test('the 13-player board shows three tracks and the Confession history', async ({ page }) => {
  await openGame(page, board13State())
  await passShield(page)

  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
  await expect(page.locator('.board-tracks > section')).toHaveCount(3)
  await expect(page.getByRole('region', { name: 'Liberal policies' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Fascist policies' })).toBeVisible()
  const communist = page.getByRole('region', { name: 'Communist track' })
  await expect(communist).toBeVisible()
  const spaces = communist.locator('ol > li > *')
  await expect(spaces).toHaveCount(6)
  expect(await spaces.evaluateAll((elements) => elements.map((el) => el.getAttribute('aria-label')))).toEqual([
    'Blank',
    'Radicalisation',
    'Five-Year Plan',
    'Radicalisation',
    'Confession',
    'Victory',
  ])
  await expect(page.getByRole('region', { name: 'Public confession history' })).toBeVisible()
  await expect(page.getByText('Round 2 · Alice · Communist', { exact: true })).toBeVisible()
})

test('the 5-player board shows two tracks and no Communist content', async ({ page }) => {
  await openGame(page, board5State())
  await passShield(page)

  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
  await expect(page.locator('.board-tracks > section')).toHaveCount(2)
  await expect(page.getByRole('region', { name: 'Communist track' })).toHaveCount(0)
  expect(await page.locator('main').innerText()).not.toMatch(/communist/i)
  await expect(page.getByRole('region', { name: 'Public confession history' })).toHaveCount(0)
})

test('Radicalisation walks every seat and hides the target and result', async ({ page }) => {
  await openGame(page, radicalisePickState())
  await passShield(page)
  await expectRadicalisationCover(page)
  await expectPicker(page)
  await pickTarget(page, 'Cara')
  await walkRadicalisation(page, 'Cara', true)

  const saved = await savedState(page)
  expect(saved.phase).toBe('nomination')
  const original = makeState(ROLES_11)
  const changed = saved.players.filter(
    (player, index) => player.party !== original.players[index].party,
  )
  expect(changed).toHaveLength(1)
  expect(saved.players[2]).toMatchObject({ role: 'fascist', party: 'communist' })
  expect(saved.radicalisation).toBeNull()
  expect(saved.players.filter((player) => player.party === 'communist')).toHaveLength(3)
})

test('Radicalisation no-op target (Hitler) still resolves as No change', async ({ page }) => {
  await openGame(page, radicalisePickState())
  await passShield(page)
  await expectRadicalisationCover(page)
  await expectPicker(page)
  await pickTarget(page, 'Gus')
  await walkRadicalisation(page, 'Gus', false)

  const saved = await savedState(page)
  expect(saved.phase).toBe('nomination')
  expect(saved.players.every((player, index) => player.party === partyForRole(ROLES_11[index]))).toBe(true)
  expect(saved.players[6]).toMatchObject({ role: 'hitler', party: 'fascist' })
  expect(saved.players.filter((player) => player.party === 'communist')).toHaveLength(2)
})

test('Confession shows the snapshot party and publishes it after acknowledgement', async ({ page }) => {
  const state = confessionState()
  await openGame(page, state)
  await passShield(page)

  const dialog = page.getByRole('dialog', { name: 'Confession' })
  await expect(dialog).toContainText('Pass the phone to the President.')
  expect(await dialog.innerText()).not.toContain('Liberal')
  expect(await dialog.innerText()).not.toContain('Dan')
  await expect(page.getByText(/Round 2 · Dan ·/)).toHaveCount(0)

  await dialog.getByRole('button', { name: 'The President has the phone' }).click()
  await expect(dialog).toContainText('Show this screen to the table.')
  await expect(dialog.locator('p.text-4xl')).toHaveText('Liberal')
  const text = await dialog.innerText()
  expect(text).not.toContain('Fascist')
  expect(text).not.toContain('Communist')
  expect(text).not.toContain('Dan')
  expect(text).not.toMatch(/role/i)

  const pending = await savedState(page)
  expect(pending.confession).toEqual({ playerId: 3, party: 'liberal' })
  expect(pending.players[3].party).toBe('communist')

  await dialog.getByRole('button', { name: 'The table has seen it' }).click()
  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
  const history = page.getByRole('region', { name: 'Public confession history' })
  await expect(history).toBeVisible()
  await expect(history.getByText('Round 2 · Dan · Liberal', { exact: true })).toBeVisible()
  const saved = await savedState(page)
  expect(saved.confessions).toEqual([{ playerId: 3, party: 'liberal', round: 2 }])
})

test('Five-Year Plan reports 26 cards and does not grow twice', async ({ page }) => {
  await openGame(page, fiveYearPlanState())
  await passShield(page)

  const dialog = page.getByRole('dialog', { name: 'Five-Year Plan' })
  await expect(dialog).toContainText('2 Communist and 1 Liberal policies were added to the draw deck and shuffled.')
  await expect(dialog.getByText('Draw deck: 26', { exact: true })).toBeVisible()
  await expect(dialog.locator('.policy-card')).toHaveCount(0)
  expect(await dialog.innerText()).not.toMatch(/Communist policy|Liberal policy|Fascist policy/)

  await dialog.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
  const saved = await savedState(page)
  expect(saved.phase).toBe('nomination')
  expect(saved.deck).toHaveLength(26)
  expect(saved.discard).toHaveLength(0)
  expect(saved.enactedCommunist).toBe(2)
})

test('a sixth Communist policy wins for the Communists', async ({ page }) => {
  await openGame(page, communistWinState())
  await passShield(page)

  const chancellor = page.getByRole('dialog', { name: 'Chancellor: enact one policy' })
  await expect(chancellor).toBeVisible()
  await chancellor.getByRole('button', { name: 'Reveal cards' }).click()
  await confirmWith(page, /^Yes, reveal to /)
  await chancellor.getByRole('button', { name: 'Communist policy' }).click()

  const over = page.getByRole('dialog', { name: 'The Communists win' })
  await expect(over).toBeVisible()
  await expect(over).toContainText('6 Communist policies were enacted.')
  await expect(over.getByText('2/5', { exact: true })).toBeVisible()
  await expect(over.getByText('1/6', { exact: true })).toBeVisible()
  await expect(over.getByText('6/6', { exact: true })).toBeVisible()
  await expect(over.getByRole('heading', { name: 'Final roles' })).toBeVisible()
  const saved = await savedState(page)
  expect(saved.gameOver).toEqual({ winners: ['communist'], reason: 'communistPolicies' })
})

test('executing Hitler at 11+ is a joint Liberal and Communist win', async ({ page }) => {
  await openGame(page, jointWinState())
  await passShield(page)

  const panel = page.getByRole('dialog', { name: 'Execution' })
  await expect(panel).toBeVisible()
  await panel.getByRole('button', { name: 'Gus', exact: true }).click()
  await page.getByRole('dialog', { name: 'Execute Gus?' }).getByRole('button', { name: 'Execute Gus' }).click()

  const over = page.getByRole('dialog', { name: 'The Liberals and Communists win' })
  await expect(over).toBeVisible()
  await expect(over).toContainText('Hitler was executed.')
  await expect(over.locator('span.h-16 svg')).toHaveCount(2)
  await expect(over.getByText('2/5', { exact: true })).toBeVisible()
  await expect(over.getByText('2/6', { exact: true })).toBeVisible()
  await expect(over.getByText('1/6', { exact: true })).toBeVisible()
  await expect(over.getByRole('heading', { name: 'Final roles' })).toBeVisible()
  const saved = await savedState(page)
  expect(saved.gameOver).toEqual({ winners: ['liberal', 'communist'], reason: 'hitlerExecuted' })
})

test('executing Hitler at 5 players stays a Liberal-only win, not a Communist one', async ({ page }) => {
  await openGame(page, baseExecuteState())
  await passShield(page)

  const panel = page.getByRole('dialog', { name: 'Execution' })
  await panel.getByRole('button', { name: 'Bob', exact: true }).click()
  await page.getByRole('dialog', { name: 'Execute Bob?' }).getByRole('button', { name: 'Execute Bob' }).click()

  const over = page.getByRole('dialog', { name: 'The liberals win' })
  await expect(over).toBeVisible()
  await expect(over).toContainText('Hitler was executed.')
  expect(await over.innerText()).not.toMatch(/Communist/)
  await expect(over.getByRole('heading', { name: 'Final roles' })).toHaveCount(0)
  const saved = await savedState(page)
  expect(saved.gameOver).toEqual({ winners: ['liberal'], reason: 'hitlerExecuted' })
})

test('resume during the Radicalisation picker keeps the step', async ({ page }) => {
  await openGame(page, radicalisePickState(), { once: true })
  await passShield(page)
  await expectRadicalisationCover(page)
  await expectPicker(page)

  await page.reload()
  await expect(page.locator('.privacy-cover')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('Choose one living player')
  await passShield(page)
  await expectRadicalisationCover(page)
  await expectPicker(page)

  const saved = await savedState(page)
  expect(saved.phase).toBe('communistPower')
  expect(saved.pendingAction).toEqual({ type: 'radicalise', actorId: 3 })
  expect(saved.radicalisation).toBeNull()
})

test('resume mid-Radicalisation keeps the seat index and one conversion', async ({ page }) => {
  await openGame(page, radicaliseRevealState(3), { once: true })
  await passShield(page)

  const dialog = page.getByRole('dialog', { name: 'Radicalisation' })
  await expect(dialog).toContainText('Pass to Dan')
  let saved = await savedState(page)
  expect(saved.radicalisation?.revealIndex).toBe(3)
  expect(saved.players.filter((player) => player.party === 'communist')).toHaveLength(3)

  await dialog.getByRole('button', { name: 'Reveal', exact: true }).click()
  await expect(dialog).toContainText('No change')
  await dialog.getByRole('button', { name: 'Hide and pass' }).click()
  await expect(dialog).toContainText('Pass to Eve')

  await page.reload()
  await expect(page.locator('.privacy-cover')).toBeVisible()
  expect(await page.locator('body').innerHTML()).not.toMatch(/You are now a Communist|No change/)
  await passShield(page)
  await expect(dialog).toContainText('Pass to Eve')

  saved = await savedState(page)
  expect(saved.radicalisation?.revealIndex).toBe(4)
  const converted = saved.players.filter((player) => player.party === 'communist')
  expect(converted).toHaveLength(3)
  expect(saved.players[2]).toMatchObject({ role: 'fascist', party: 'communist' })
  expect(converted.filter((player) => player.role === 'communist')).toHaveLength(2)
})

test('resume during Confession keeps the snapshot and hides the party', async ({ page }) => {
  await openGame(page, confessionState(), { once: true })
  await passShield(page)

  const dialog = page.getByRole('dialog', { name: 'Confession' })
  await dialog.getByRole('button', { name: 'The President has the phone' }).click()
  await expect(dialog.locator('p.text-4xl')).toHaveText('Liberal')

  await page.reload()
  await expect(page.locator('.privacy-cover')).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('Show this screen to the table.')
  await passShield(page)
  await expect(dialog).toContainText('Pass the phone to the President.')
  expect(await dialog.innerText()).not.toContain('Liberal')
  await dialog.getByRole('button', { name: 'The President has the phone' }).click()
  await expect(dialog.locator('p.text-4xl')).toHaveText('Liberal')

  const saved = await savedState(page)
  expect(saved.phase).toBe('communistPower')
  expect(saved.confession).toEqual({ playerId: 3, party: 'liberal' })

  await dialog.getByRole('button', { name: 'The table has seen it' }).click()
  await expect(page.getByText('Round 2 · Dan · Liberal', { exact: true })).toBeVisible()
})

test('resume during Five-Year Plan does not grow the deck again', async ({ page }) => {
  await openGame(page, fiveYearPlanState(), { once: true })
  await passShield(page)

  const dialog = page.getByRole('dialog', { name: 'Five-Year Plan' })
  await expect(dialog.getByText('Draw deck: 26', { exact: true })).toBeVisible()

  await page.reload()
  await expect(page.locator('.privacy-cover')).toBeVisible()
  await passShield(page)
  await expect(dialog.getByText('Draw deck: 26', { exact: true })).toBeVisible()

  await dialog.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
  const saved = await savedState(page)
  expect(saved.deck).toHaveLength(26)
  expect(saved.phase).toBe('nomination')
})

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹'
const faNum = (value: number): string =>
  String(value).replace(/\d/g, (digit) => FA_DIGITS[Number(digit)])

async function loadStateAndReload(page: Page, state: GameState): Promise<void> {
  await page.evaluate((next) => {
    localStorage.setItem('sh.game', JSON.stringify(next))
    history.replaceState(null, '', '#/game')
  }, state)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
}

test('FA RTL 360×640: setup, Radicalisation, board and final roles fit', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  await page.addInitScript(() => {
    localStorage.setItem('sh.settings', JSON.stringify({ v: 2, settings: { locale: 'fa' } }))
  })

  // Flow 1: the 13-player wizard in Persian.
  await page.goto('/')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('button', { name: 'شروع بازی' }).click()
  await expect(page.getByRole('heading', { name: 'چند بازیکن داریم؟' })).toBeVisible()
  await page
    .getByRole('button', { name: `${faNum(13)} بازیکن، افزونهٔ کمونیست` })
    .click()
  await expect(page.getByText('افزونهٔ هواداری', { exact: true })).toBeVisible()
  await expectFullyVisible(page, page.getByRole('button', { name: 'بعدی', exact: true }))
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'بعدی', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'نام بازیکنان' })).toBeVisible()
  for (const [index, name] of WIDE_NAMES.entries()) {
    await page.getByLabel(`بازیکن ${faNum(index + 1)}`, { exact: true }).fill(name)
  }
  await expectFullyVisible(page, page.getByRole('button', { name: 'بعدی', exact: true }))
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'بعدی', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'تقسیم نقش‌ها' })).toBeVisible()
  for (const [label, count] of [
    ['لیبرال‌ها', '۶'],
    ['فاشیست‌ها', '۳'],
    ['هیتلر', '۱'],
    ['کمونیست‌ها', '۳'],
  ] as const) {
    await expect(panelWith(page, label).first().locator('span.text-2xl')).toHaveText(count)
  }
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'بعدی', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'میز را آماده کنید' })).toBeVisible()
  await expect(page.getByText('۸ کارت سیاست کمونیست', { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  await page.getByRole('button', { name: 'بعدی', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'آماده شروع هستید؟' })).toBeVisible()
  await expect(page.getByText('افزونهٔ کمونیست', { exact: true })).toBeVisible()
  await expectFullyVisible(page, page.getByRole('button', { name: 'ساخت بازی' }))
  await expectNoHorizontalOverflow(page)

  // Flow 3: private Radicalisation handoff and the public resolved step.
  await loadStateAndReload(page, radicalisePickState())
  await passShield(page)
  const cover = page.getByRole('dialog', { name: 'همه چشمانتان را ببندید' })
  await expect(cover).toContainText('گوشی را به رئیس‌جمهور بدهید.')
  expect(await cover.innerText()).not.toContain('Cara')
  expect(await cover.innerText()).not.toContain('کمونیست')
  await expectFullyVisible(page, cover.getByRole('button', { name: 'گوشی دست رئیس‌جمهور است' }))
  await expectNoHorizontalOverflow(page)
  await expectNoHorizontalOverflow(page, 'dialog')
  await cover.getByRole('button', { name: 'گوشی دست رئیس‌جمهور است' }).click()

  const picker = page.getByRole('dialog', { name: 'رادیکالیزه کردن' })
  await expect(picker).toContainText('یک بازیکن زنده انتخاب کنید.')
  await picker.getByRole('button', { name: 'Cara', exact: true }).click()
  await page
    .getByRole('dialog', { name: 'رادیکالیزه کردن Cara؟' })
    .getByRole('button', { name: 'رادیکالیزه کردن Cara' })
    .click()

  for (const [index, name] of NAMES_11.entries()) {
    const handoff = page.getByRole('dialog', { name: 'رادیکالیزه کردن' })
    await expect(handoff).toContainText(`گوشی را به ${name} بدهید`)
    const before = await handoff.innerText()
    expect(before).not.toContain('شما حالا کمونیست هستید')
    expect(before).not.toContain('چیزی تغییر نکرد')
    if (name !== 'Cara') expect(before).not.toContain('Cara')
    expect(before).not.toContain('کمونیست')

    await expectFullyVisible(page, handoff.getByRole('button', { name: 'نمایش', exact: true }))
    await handoff.getByRole('button', { name: 'نمایش', exact: true }).click()
    const revealed = await handoff.innerText()
    if (name === 'Cara') {
      expect(revealed).toContain('شما حالا کمونیست هستید')
      expect(revealed).not.toContain('چیزی تغییر نکرد')
    } else {
      expect(revealed).toContain('چیزی تغییر نکرد')
      expect(revealed).not.toContain('شما حالا کمونیست هستید')
      expect(revealed).not.toContain('کمونیست')
    }
    await expectNoHorizontalOverflow(page)
    await expectNoHorizontalOverflow(page, 'dialog')
    await expectFullyVisible(page, handoff.getByRole('button', { name: 'پنهان کردن و ادامه' }))
    await handoff.getByRole('button', { name: 'پنهان کردن و ادامه' }).click()
    if (index < NAMES_11.length - 1) {
      await expect(handoff).toContainText(`گوشی را به ${NAMES_11[index + 1]} بدهید`)
    } else {
      await expect(page.getByRole('dialog', { name: 'رادیکالیزه کردن انجام شد' })).toBeVisible()
    }
    expect(await page.locator('body').innerHTML()).not.toMatch(/شما حالا کمونیست هستید|چیزی تغییر نکرد/)
  }

  const resolved = page.getByRole('dialog', { name: 'رادیکالیزه کردن انجام شد' })
  await expect(resolved).toContainText('مسیر کمونیست جلو رفت.')
  expect(await resolved.innerText()).not.toContain('Cara')
  await expectFullyVisible(page, resolved.getByRole('button', { name: 'ادامه' }))
  await expectNoHorizontalOverflow(page)
  await expectNoHorizontalOverflow(page, 'dialog')
  await resolved.getByRole('button', { name: 'ادامه' }).click()
  expect((await savedState(page)).phase).toBe('nomination')

  // Flow 6: the 13-player board with the public Confession record.
  await loadStateAndReload(page, board13State())
  await passShield(page)
  await expect(page.getByRole('heading', { name: 'صدراعظم را نامزد کنید' })).toBeVisible()
  await expect(page.locator('.board-tracks > section')).toHaveCount(3)
  await expect(page.getByRole('region', { name: 'مسیر کمونیست' })).toBeVisible()
  const history = page.getByRole('region', { name: 'تاریخچهٔ اعتراف‌های عمومی' })
  await expect(history.getByText(`دور ${faNum(2)} · Alice · کمونیست`, { exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(page)

  // Flow 7: final roles with the radicalised marker in the game-over dialog.
  await loadStateAndReload(page, jointGameOverState())
  await passShield(page)
  const over = page.getByRole('dialog', { name: 'لیبرال‌ها و کمونیست‌ها برنده شدند' })
  await expect(over).toBeVisible()
  await expect(over.getByRole('heading', { name: 'نقش‌های پایانی' })).toBeVisible()
  await expect(over.getByText('رادیکالیزه‌شده', { exact: true })).toBeVisible()
  const converted = over.locator('li').filter({ hasText: 'Eve' })
  await expect(converted).toContainText('حزب: کمونیست')
  await expect(over.locator('span.h-16 svg')).toHaveCount(2)
  await expectNoHorizontalOverflow(page)
  await expectNoHorizontalOverflow(page, 'dialog')
  await expectFullyVisible(page, over.getByRole('button', { name: 'شروع بازی جدید' }))
})


test('how-to-play covers the expansion and keeps the 5–10 rules', async ({ page }) => {
  await page.goto('/#/how-to-play')
  await expect(page.getByRole('heading', { name: 'How to play', level: 1 })).toBeVisible()

  const sectionFor = (name: string) =>
    page.locator('section').filter({ has: page.getByRole('heading', { name, exact: true }) })

  const expansion = sectionFor('Communist expansion (11–13 players)')
  await expect(expansion).toContainText('third party')
  await expect(expansion).toContainText('fan-made expansion')
  await expect(expansion).toContainText('chosen by player count alone')
  await expect(expansion).toContainText('Below 11 players it is off')

  const roles = sectionFor('Roles at 11–13')
  await expect(roles).toContainText('11 players: 5 liberals, 3 fascists, 2 communists and Hitler.')
  await expect(roles).toContainText('12: 6/3/2 and Hitler.')
  await expect(roles).toContainText('13: 6/3/3 and Hitler.')
  await expect(roles).toContainText('fascist count never includes Hitler')
  await expect(roles).toContainText('Communists know each other; Hitler does not know them.')

  const deck = sectionFor('Deck and board')
  await expect(deck).toContainText('23 tiles: 8 communist, 5 liberal and 10 fascist')
  await expect(deck).toContainText('fascist board for 9–10 players')
  await expect(deck).toContainText('Five-Year Plan adds 2 communist and 1 liberal tile')
  await expect(deck).toContainText('26 tiles in play')

  const track = sectionFor('Communist track')
  await expect(track).toContainText(
    'blank, Radicalisation, Five-Year Plan, Radicalisation, Confession, and victory',
  )
  await expect(track).toContainText('sixth communist policy ends the game')

  const secret = sectionFor('Radicalisation and Confession')
  await expect(secret).toContainText('secret pass-the-phone steps')
  await expect(secret).toContainText('converts one player to the communist party')
  await expect(secret).toContainText('keeps their secret role card')
  await expect(secret).toContainText('party changes permanently')
  await expect(secret).toContainText('win or lose with their current party')
  await expect(secret).toContainText('Confession shows the sitting president')

  const victory = sectionFor('Victory with the expansion')
  await expect(victory).toContainText('Six communist policies win for the Communists only')
  await expect(victory).toContainText('joint liberal and communist win')

  // Credits: rules inspired by Secret Hitler XL and the Socialist Expansion.
  await expect(page.getByText('Secret Hitler XL', { exact: false })).toBeVisible()
  await expect(page.getByText('Bo-Jivan Parker', { exact: false })).toBeVisible()
  await expect(page.getByText('Socialist Expansion', { exact: false })).toBeVisible()

  // The base 5–10 rules are still present and unchanged.
  const distribution = sectionFor('Distribution')
  await expect(distribution).toContainText('5 players: 3 liberals, 1 fascist, 1 Hitler.')
  await expect(distribution).toContainText('10: 6/3/1.')
  await expect(sectionFor('Roles and teams')).toContainText('4–6 player games')
  await expect(sectionFor('Setup')).toContainText('6 liberal and 11 fascist policy tiles')
})
