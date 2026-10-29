import { expect, type Page } from '@playwright/test'

export const NAMES = ['Alice', 'Bob', 'Cara', 'Dan', 'Eve', 'Finn', 'Gus']

/** Walks the five setup steps and confirms the role shuffle. */
export async function createGame(page: Page, names = NAMES): Promise<void> {
  await page.goto('/')
  await page.getByRole('button', { name: 'Start game' }).click()
  await page.getByRole('button', { name: `${names.length} players` }).click()
  await page.getByRole('button', { name: 'Next', exact: true }).click()

  for (const [index, name] of names.entries()) {
    await page.getByLabel(`Player ${index + 1}`, { exact: true }).fill(name)
  }

  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Role distribution' })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Prepare the table' })).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Ready to begin?' })).toBeVisible()
  await page.getByRole('button', { name: 'Create game' }).click()

  const confirm = page.getByRole('dialog').last()
  await expect(confirm).toContainText('Shuffle roles now?')
  await confirm.getByRole('button', { name: 'Create game' }).click()
  await expect(page).toHaveURL(/#\/reveal$/)
}

/** Reveals and hides every role without asserting any secret content. */
export async function revealAllRoles(page: Page, names = NAMES): Promise<void> {
  for (const [index, name] of names.entries()) {
    await expect(page.getByRole('heading', { name: `Pass the phone to ${name}` })).toBeVisible()
    await page.getByRole('button', { name: new RegExp(`^I am ${name}`) }).click()
    await expect(page.getByText('Your secret role')).toBeVisible()
    const last = index === names.length - 1
    await hideRole(page, last)
  }
  await expect(page).toHaveURL(/#\/game$/)
  await expect(page.getByRole('heading', { name: 'Nominate a chancellor' })).toBeVisible()
}

/** Confirms hiding the current role and advances the reveal. */
export async function hideRole(page: Page, last = false): Promise<void> {
  await page
    .getByRole('button', {
      name: last ? 'Hide role and start the game' : 'Hide role and pass on',
    })
    .click()
  await confirmWith(page, 'Yes, hide role')
}

/** Clicks confirm in the topmost dialog. */
export async function confirmWith(page: Page, button: string | RegExp): Promise<void> {
  await page.getByRole('dialog').last().getByRole('button', { name: button }).click()
}

/** Nominates the first eligible player and records an approved vote. */
export async function electGovernment(page: Page): Promise<void> {
  const eligible = page.getByRole('button').filter({ hasText: 'Eligible' }).first()
  await eligible.click()
  await expect(page.getByText(/^Choose /)).toBeVisible()
  await page.getByRole('button', { name: 'Nominate', exact: true }).click()
  await confirmWith(page, 'Nominate')
  await expect(page.getByRole('heading', { name: 'Record the vote' })).toBeVisible()
  await page.getByRole('button', { name: 'Government approved' }).click()
  await confirmWith(page, 'Confirm approval')
  await expect(page.getByRole('dialog', { name: 'President: discard one policy' })).toBeVisible()
}

/** Reveals a hand and clicks its first face-up card. */
export async function revealFirstCard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Reveal cards' }).click()
  await confirmWith(page, /^Yes, reveal to /)
  await page.getByRole('button', { name: /^(Liberal|Fascist) policy$/ }).first().click()
}
