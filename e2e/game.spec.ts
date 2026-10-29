import { expect, test } from '@playwright/test'
import { createGame as createEngineGame } from '../src/game/engine'
import { seededRng } from '../src/game/rng'
import type { GameState, Policy } from '../src/game/types'
import { NAMES, confirmWith, createGame, electGovernment, hideRole, revealAllRoles, revealFirstCard } from './helpers'

test('setup, private reveals, an approved government and a resume mid-session', async ({ page }) => {
  await createGame(page, NAMES)
  await revealAllRoles(page, NAMES)

  // Cancelling a nomination confirmation must leave the table untouched.
  await page.getByRole('button').filter({ hasText: 'Eligible' }).first().click()
  await expect(page.getByText(/^Choose /)).toBeVisible()
  await page.getByRole('button', { name: 'Nominate', exact: true }).click()
  await expect(page.getByRole('dialog').last()).toBeVisible()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Record the vote' })).toHaveCount(0)

  await electGovernment(page)

  await revealFirstCard(page)
  await confirmWith(page, 'Discard this policy')

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
  await confirmWith(page, 'Enact this policy')

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

test('cancelling the role-hide confirmation keeps the role on screen', async ({ page }) => {
  await createGame(page)
  await page.getByRole('button', { name: /^I am Alice/ }).click()
  await expect(page.getByText('Your secret role')).toBeVisible()

  await page.getByRole('button', { name: 'Hide role and pass on' }).click()
  await expect(page.getByRole('dialog').last()).toBeVisible()
  await page.getByRole('dialog').last().getByRole('button', { name: 'Cancel' }).click()

  await expect(page.getByText('Your secret role')).toBeVisible()
  await expect(page.getByText('1 of 7')).toBeVisible()
  await hideRole(page)
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
    await confirmWith(page, 'Nominate')

    await page.getByRole('button', { name: 'Government approved' }).click()
    await confirmWith(page, 'Confirm approval')

    await expect(page.getByRole('dialog', { name: 'President: discard one policy' })).toBeVisible()
    await page.getByRole('button', { name: 'Reveal cards' }).click()
    await confirmWith(page, /^Yes, reveal to /)
    await page.getByRole('button', { name: 'Fascist policy' }).first().click()
    await confirmWith(page, 'Discard this policy')

    await expect(page.getByRole('dialog', { name: 'Chancellor: enact one policy' })).toBeVisible()
    await page.getByRole('button', { name: 'Reveal cards' }).click()
    await confirmWith(page, /^Yes, reveal to /)
    await page.getByRole('button', { name: 'Liberal policy' }).click()
    await confirmWith(page, 'Enact this policy')
  }

  await expect(page.getByRole('dialog', { name: 'The liberals win' })).toBeVisible()
  await expect(page.getByText('Five liberal policies were enacted.', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'New game' }).click()
  await confirmWith(page, 'Create game')
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
