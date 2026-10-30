import { expect, test, type Page } from '@playwright/test'
import { createGame as createEngineGame } from '../src/game/engine'
import { partyForRole } from '../src/game/constants'
import { seededRng } from '../src/game/rng'
import type { GameState, Policy, Role } from '../src/game/types'
import { NAMES, confirmWith, createGame, electGovernment, hideRole, revealAllRoles, revealFirstCard } from './helpers'

/** A role-reveal save with fixed roles so each role's card can be proven. */
function roleRevealSave(roles: Role[]): GameState {
  const created = createEngineGame(
    { playerCount: roles.length, names: NAMES.slice(0, roles.length) },
    seededRng(9),
  )
  if (!created.ok) throw new Error(created.error.code)
  return {
    ...created.state,
    phase: 'roleReveal',
    revealIndex: 0,
    players: created.state.players.map((player, index) => ({
      ...player,
      role: roles[index],
      party: partyForRole(roles[index]),
    })),
  }
}

/** Opens /reveal on a fixed save, optionally persisting app settings. */
async function openReveal(
  page: Page,
  roles: Role[],
  settings?: Record<string, unknown>,
): Promise<void> {
  const state = roleRevealSave(roles)
  await page.addInitScript(
    (init) => {
      localStorage.setItem('sh.game', JSON.stringify(init.state))
      if (init.settings) {
        localStorage.setItem('sh.settings', JSON.stringify({ v: 1, settings: init.settings }))
      }
    },
    { state, settings },
  )
  await page.goto('/#/reveal')
  await expect(page.getByRole('heading', { name: 'Pass the phone to Alice' })).toBeVisible()
}

const ROLE_CASES: Array<{ role: Role; title: string; team: string; knowledge: string; players: Role[] }> = [
  {
    role: 'liberal',
    title: 'Liberal',
    team: 'Team Liberal',
    knowledge: 'You do not know the other roles.',
    players: ['liberal', 'fascist', 'hitler', 'liberal', 'liberal', 'liberal'],
  },
  {
    role: 'fascist',
    title: 'Fascist',
    team: 'Team Fascist',
    knowledge: 'Hitler is Bob.',
    players: ['fascist', 'hitler', 'liberal', 'liberal', 'liberal', 'liberal'],
  },
  {
    role: 'hitler',
    title: 'Hitler',
    team: 'Team Fascist',
    knowledge: 'The fascists are Bob.',
    players: ['hitler', 'fascist', 'liberal', 'liberal', 'liberal', 'liberal'],
  },
]

test('setup, private reveals, an approved government and a resume mid-session', async ({ page }) => {
  await createGame(page, NAMES)
  await revealAllRoles(page, NAMES)

  await electGovernment(page)

  await revealFirstCard(page)

  const chancellorDialog = page.getByRole('dialog', { name: 'Chancellor: enact one policy' })
  await expect(chancellorDialog).toBeVisible()

  // Reloading must restore the same phase but never the revealed faces.
  await page.reload()
  await expect(page.getByText('Pass the phone to the operator')).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByText('Cards are face down')).toHaveCount(0)
  await page.getByRole('button', { name: 'Tap to show' }).click()

  await expect(page.getByRole('dialog', { name: 'Chancellor: enact one policy' })).toBeVisible()
  await expect(page.getByText('Cards are face down').first()).toBeVisible()
  await expect(page.getByText('Liberal policy')).toHaveCount(0)
  await expect(page.getByText('Fascist policy')).toHaveCount(0)

  await revealFirstCard(page)

  await expect(page.locator('h1')).toContainText(/Round/)
  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('duplicate names block the setup wizard', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: '5 players' }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  await page.getByLabel('Player 1', { exact: true }).fill('Sam')
  await page.getByLabel('Player 2', { exact: true }).fill('sam')

  await expect(page.getByRole('alert')).toContainText('used twice')
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled()

  await page.getByLabel('Player 2', { exact: true }).fill('Alex')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled()
})

test('the four-player house variant runs on the short tracks', async ({ page }) => {
  const names = NAMES.slice(0, 4)
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: '4 players, house variant' }).click()
  await expect(page.getByText('House variant', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  for (const [index, name] of names.entries()) {
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name)
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Role distribution' })).toBeVisible()
  await expect(page.getByText('House variant: two liberals against one fascist and Hitler.')).toBeVisible()

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('The 4-player board has 4 liberal spaces and 5 fascist spaces')).toBeVisible()

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('Board variant: 4 players (house variant)')).toBeVisible()
  await page.getByRole('button', { name: 'Create game' }).click()
  await confirmWith(page, 'Shuffle and start')

  await revealAllRoles(page, names)
  await expect(
    page.getByRole('region', { name: 'Liberal policies' }).locator('.track-space'),
  ).toHaveCount(4)
  await expect(
    page.getByRole('region', { name: 'Fascist policies' }).locator('.track-space'),
  ).toHaveCount(5)
  // The government chips must quote the same maxima as the tracks.
  await expect(page.getByText('0/4', { exact: true })).toBeVisible()
  await expect(page.getByText('0/5', { exact: true })).toBeVisible()
})

test('a newer save is refused without touching the game', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('sh.game', JSON.stringify({ schemaVersion: 99 }))
  })
  await page.goto('/')

  await expect(page.getByText('This save was made by a newer version of the app.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Resume game' })).toHaveCount(0)

  await page.getByRole('button', { name: 'Delete saved game' }).click()
  await confirmWith(page, 'Delete saved game')
  await expect(page.getByText('This save was made by a newer version of the app.')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Start game' })).toBeVisible()
})

for (const scenario of ROLE_CASES) {
  test(`the face-down card conceals ${scenario.title} until a single activation`, async ({ page }) => {
    await openReveal(page, scenario.players)
    await page.getByRole('button', { name: /^I am Alice/ }).click()
    await expect(page.getByText('Your secret role')).toBeVisible()
    await expect(page.locator('.role-card')).toBeVisible()

    // Privacy before the flip: no role word in the screen, header or DOM
    // (the serialized body also catches hidden nodes that innerText skips).
    expect(await page.locator('main').innerText()).not.toMatch(/\b(Liberal|Fascist|Hitler)\b/)
    expect(await page.locator('.page > header').innerText()).not.toMatch(/\b(Liberal|Fascist|Hitler)\b/)
    expect(await page.locator('body').innerHTML()).not.toMatch(/\b(Liberal|Fascist|Hitler)\b/)
    for (const word of ['Liberal', 'Fascist', 'Hitler', 'Team Liberal', 'Team Fascist']) {
      await expect(page.getByText(word, { exact: true })).toHaveCount(0)
    }

    // Gated UI: the knowledge panel and hide action do not exist yet.
    await expect(page.getByText('What you know')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Hide role/ })).toHaveCount(0)

    // Exactly one activation reveals the role.
    const card = page.getByRole('button', { name: 'Tap to reveal' })
    await expect(card).toBeVisible()
    await card.click()

    await expect(page.locator('.role-card-front')).toBeVisible()
    await expect(page.locator('.role-card-front h1')).toHaveText(scenario.title)
    await expect(page.locator('.role-card-front p')).toHaveText(scenario.team)
    await expect(page.getByText('What you know')).toBeVisible()
    await expect(page.getByText(scenario.knowledge)).toBeVisible()
    await expect(page.getByRole('button', { name: /^Hide role/ })).toBeVisible()

    // The card is no longer an activatable button; its only tabindex is the
    // programmatic focus target that announces the role after the flip.
    await expect(card).toHaveCount(0)
    await expect(page.locator('.role-card button')).toHaveCount(0)
    await expect(page.locator('.role-card [tabindex="-1"]')).toHaveCount(1)

    // A second activation does nothing and does not re-hide the role.
    await page.locator('.role-card-front').click()
    await expect(page.locator('.role-card')).toHaveClass(/flipped/)
    await expect(page.locator('.role-card-front h1')).toHaveText(scenario.title)
    await expect(page.locator('.role-card-front')).toBeVisible()
  })
}

test('the face-down card is keyboard reachable and flips with Enter and Space', async ({ page }) => {
  await openReveal(page, ['liberal', 'hitler', 'fascist', 'liberal', 'liberal', 'liberal'])
  await page.getByRole('button', { name: /^I am Alice/ }).click()

  const first = page.getByRole('button', { name: 'Tap to reveal' })
  await expect(first).toBeVisible()
  for (let i = 0; i < 8 && !(await first.evaluate((el) => el === document.activeElement)); i += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(first).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.role-card-front h1')).toHaveText('Liberal')

  await hideRole(page)
  await expect(page.getByRole('heading', { name: 'Pass the phone to Bob' })).toBeVisible()
  await page.getByRole('button', { name: /^I am Bob/ }).click()

  const second = page.getByRole('button', { name: 'Tap to reveal' })
  await expect(second).toBeVisible()
  for (let i = 0; i < 8 && !(await second.evaluate((el) => el === document.activeElement)); i += 1) {
    await page.keyboard.press('Tab')
  }
  await expect(second).toBeFocused()
  await page.keyboard.press('Space')
  await expect(page.locator('.role-card-front h1')).toHaveText('Hitler')
})

test('with animations off the flip completes instantly', async ({ page }) => {
  await openReveal(page, ['liberal', 'fascist', 'hitler', 'liberal', 'liberal', 'liberal'], {
    animations: false,
  })
  await expect(page.locator('html')).toHaveAttribute('data-animations', 'off')
  await page.getByRole('button', { name: /^I am Alice/ }).click()

  const raw = await page.locator('.role-card-inner').evaluate((el) => getComputedStyle(el).transitionDuration)
  const ms = raw.trim().endsWith('ms') ? Number.parseFloat(raw) : Number.parseFloat(raw) * 1000
  expect(ms, `transition-duration is ${raw}`).toBeLessThan(16)

  await page.getByRole('button', { name: 'Tap to reveal' }).click()
  await expect(page.locator('.role-card')).toHaveClass(/flipped/)
  await expect(page.locator('.role-card-front h1')).toHaveText('Liberal')
})

test('the card flips in Persian RTL and its role text is not clipped', async ({ page }) => {
  await openReveal(page, ['liberal', 'fascist', 'hitler', 'liberal', 'liberal', 'liberal'])
  await page.goto('/#/settings')
  await page.getByRole('button', { name: 'فارسی' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.goto('/#/reveal')

  await page.getByRole('button', { name: /^من Alice/ }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  await page.getByRole('button', { name: 'برای دیدن نقش، لمس کنید' }).click()

  await expect(page.locator('.role-card-front h1')).toHaveText('لیبرال')
  await expect(page.locator('.role-card-front p')).toHaveText('تیم لیبرال')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow, `page overflows horizontally by ${overflow}px`).toBeLessThanOrEqual(1)
  // The card clips overflow, so the real test is that each text run stays
  // inside the face box (the Persian line box alone overflows its tight line-height).
  const clipped = await page.evaluate(() => {
    const card = document.querySelector('.role-card-front')!.getBoundingClientRect()
    return [...document.querySelectorAll('.role-card-front h1, .role-card-front p')]
      .filter((el) => {
        const range = document.createRange()
        range.selectNodeContents(el)
        const text = range.getBoundingClientRect()
        return (
          text.left < card.left - 1 ||
          text.right > card.right + 1 ||
          text.top < card.top - 1 ||
          text.bottom > card.bottom + 1
        )
      })
      .map((el) => el.textContent ?? '')
  })
  expect(clipped, `clipped text: ${clipped.join(', ')}`).toEqual([])
})

test('hiding a revealed role needs no dialog and advances to the next player', async ({ page }) => {
  await createGame(page)
  await page.getByRole('button', { name: /^I am Alice/ }).click()
  await expect(page.getByText('Your secret role')).toBeVisible()
  await page.getByRole('button', { name: 'Tap to reveal' }).click()
  await expect(page.locator('.role-card-front')).toBeVisible()

  await page.getByRole('button', { name: 'Hide role and pass on' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Pass the phone to Bob' })).toBeVisible()
})

// A legal 17-tile deck ordered so each of the five sessions holds one liberal
// and two fascist tiles: the president discards a fascist, the chancellor
// enacts the liberal. This drives a real UI game to the liberal policy win.
const VICTORY_DECK: Policy[] = [
  'liberal', 'fascist', 'fascist',
  'fascist', 'liberal', 'fascist',
  'fascist', 'fascist', 'liberal',
  'liberal', 'fascist', 'fascist',
  'fascist', 'liberal', 'fascist',
  'liberal', 'fascist',
]

function fivePlayerNomination(): GameState {
  const created = createEngineGame({ playerCount: 5, names: NAMES.slice(0, 5) }, seededRng(11))
  if (!created.ok) throw new Error(created.error.code)
  return {
    ...created.state,
    phase: 'nomination',
    presidentId: 0,
    deck: [...VICTORY_DECK],
    discard: [],
    enactedLiberal: 0,
    enactedFascist: 0,
    lastElection: null,
    lastPresidentId: null,
    lastChancellorId: null,
    round: 1,
  }
}

test('cancelling the vote confirmation leaves the game state byte-identical', async ({ page }) => {
  const save = fivePlayerNomination()
  await page.addInitScript((state) => {
    localStorage.setItem('sh.game', JSON.stringify(state))
  }, save)
  await page.goto('/#/game')
  await page.getByRole('button', { name: 'Tap to show' }).click()
  await page.getByRole('button', { name: 'Bob', exact: true }).click()
  await page.getByRole('button', { name: 'Nominate', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Record the vote' })).toBeVisible()

  const before = await page.evaluate(() => localStorage.getItem('sh.game'))
  await page.getByRole('button', { name: 'Record approval' }).click()
  await expect(page.getByRole('dialog').last()).toBeVisible()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Record the vote' })).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('sh.game'))).toBe(before)
})

test('"Confirm routine actions" controls the nomination dialog', async ({ page }) => {
  const save = fivePlayerNomination()
  await page.addInitScript((state) => {
    localStorage.setItem('sh.game', JSON.stringify(state))
  }, save)
  const toggle = page.getByRole('switch', { name: 'Confirm routine actions' })

  // Default off: the nomination advances without a dialog.
  await page.goto('/#/settings')
  await expect(toggle).toHaveAttribute('aria-checked', 'false')
  await page.goto('/#/game')
  await page.getByRole('button', { name: 'Tap to show' }).click()
  await page.getByRole('button', { name: 'Bob', exact: true }).click()
  await page.getByRole('button', { name: 'Nominate', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Record the vote' })).toBeVisible()

  // Enabled: the same nomination asks first.
  await page.goto('/#/settings')
  await page.getByRole('switch', { name: 'Confirm routine actions' }).click()
  // The hash route does not reload, so reload here to prove the toggle persisted
  // and to restore the nomination save from the init script.
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Confirm routine actions' })).toHaveAttribute('aria-checked', 'true')
  await page.goto('/#/game')
  await page.getByRole('button', { name: 'Tap to show' }).click()
  await page.getByRole('button', { name: 'Bob', exact: true }).click()
  await page.getByRole('button', { name: 'Nominate', exact: true }).click()
  await expect(page.getByRole('dialog').last()).toContainText('Nominate Bob?')
})

test('a five-player game reaches a liberal policy victory', async ({ page }) => {
  const save = fivePlayerNomination()
  await page.addInitScript((state) => {
    localStorage.setItem('sh.game', JSON.stringify(state))
  }, save)
  await page.goto('/#/game')

  await expect(page.getByText('Pass the phone to the operator')).toBeVisible()
  await page.getByRole('button', { name: 'Tap to show' }).click()
  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()

  // President 0 rotates clockwise, so these chancellors are always eligible.
  for (const chancellor of ['Bob', 'Cara', 'Dan', 'Eve', 'Alice']) {
    await page.getByRole('button', { name: chancellor, exact: true }).click()
    await page.getByRole('button', { name: 'Nominate', exact: true }).click()

    await page.getByRole('button', { name: 'Record approval' }).click()
    await confirmWith(page, 'Confirm approval')

    await expect(page.getByRole('dialog', { name: 'President: discard one policy' })).toBeVisible()
    await page.getByRole('button', { name: 'Reveal cards' }).click()
    await confirmWith(page, /^Yes, reveal to /)
    await page.getByRole('button', { name: 'Fascist policy' }).first().click()

    await expect(page.getByRole('dialog', { name: 'Chancellor: enact one policy' })).toBeVisible()
    await page.getByRole('button', { name: 'Reveal cards' }).click()
    await confirmWith(page, /^Yes, reveal to /)
    await page.getByRole('button', { name: 'Liberal policy' }).click()
  }

  await expect(page.getByRole('dialog', { name: 'The liberals win' })).toBeVisible()
  await expect(page.getByText('5 liberal policies were enacted.', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Start new game' }).click()
  await confirmWith(page, 'Start new game')
  await expect(page).toHaveURL(/#\/setup$/)
  await expect(page.getByRole('heading', { name: 'How many players?' })).toBeVisible()
})

test('a 360×640 dp phone in landscape fits the board and actions', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 })
  const save = fivePlayerNomination()
  await page.addInitScript((state) => {
    localStorage.setItem('sh.game', JSON.stringify(state))
  }, save)
  await page.goto('/#/game')
  await page.getByRole('button', { name: 'Tap to show' }).click()

  await expect(page.getByRole('button', { name: 'Nominate', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Alice/ }).first()).toBeVisible()
  const overflow = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(overflow, `game screen overflows by ${overflow}px`).toBeLessThanOrEqual(1)
})

test('the role reveal fits a phone held sideways and focuses the revealed role', async ({ page }) => {
  await page.setViewportSize({ width: 640, height: 360 })
  await openReveal(page, ['fascist', 'hitler', 'liberal', 'liberal', 'liberal', 'liberal'])
  await page.getByRole('button', { name: /^I am Alice/ }).click()

  const fits = async (): Promise<void> => {
    const overflow = await page.evaluate(
      () => document.documentElement.scrollHeight - window.innerHeight,
    )
    expect(overflow, `reveal screen overflows by ${overflow}px`).toBeLessThanOrEqual(0)
  }

  // Face down: no sentence without its object and no page scroll.
  await expect(page.getByText('You are', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Tap to reveal' })).toBeInViewport()
  await fits()

  // Face up: the whole card and the hide action share the one screen.
  await page.getByRole('button', { name: 'Tap to reveal' }).click()
  await expect(page.locator('.role-card-front')).toBeFocused()
  await expect(page.getByText('You are', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Hide role/ })).toBeInViewport({ ratio: 1 })
  await fits()
})
