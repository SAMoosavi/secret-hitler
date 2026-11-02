import { expect, test } from '@playwright/test'

test('language and theme switch to Persian RTL and persist across reloads', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Secret Hitler' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr')

  await page.getByRole('button', { name: 'Language' }).click()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('lang', 'fa')
  await expect(page.getByRole('heading', { name: 'هیتلر مخفی' })).toBeVisible()

  await page.getByRole('button', { name: 'پوسته' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  await expect(page.getByRole('button', { name: 'شروع بازی' })).toBeVisible()
})

test('the how-to-play screen explains the physical flow', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'How to play' }).click()
  await expect(page.getByRole('heading', { name: 'How to play' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Legislative session' })).toBeVisible()
  await expect(page.getByText(/does not replace face-to-face discussion/)).toBeVisible()

  await expect(page.locator('details')).toHaveCount(20)
  await expect(page.locator('details summary h2')).toHaveCount(20)
  await expect(page.locator('details[open] summary h2')).toHaveText(['Objective', 'Turn sequence'])
})

test('settings exposes every control', async ({ page }) => {
  await page.goto('/#/settings')
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible()

  await expect(page.getByRole('button', { name: 'English' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'فارسی' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Dark' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByRole('button', { name: 'Automatic' })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: 'Prefer landscape' })).toHaveAttribute('aria-pressed', 'false')

  await expect(page.getByRole('switch')).toHaveCount(6)
  for (const name of [
    'Contrast',
    'Sound effects',
    'Haptic feedback',
    'Animations',
    'Confirm routine actions',
    'Resume automatically',
  ]) {
    await expect(page.getByRole('switch', { name })).toBeVisible()
  }

  const scale = page.locator('#board-scale')
  await expect(scale).toHaveAttribute('min', '0.85')
  await expect(scale).toHaveAttribute('max', '1')
  await expect(scale).toHaveAttribute('step', '0.05')

  await page.getByRole('button', { name: 'About & credits' }).click()
  await expect(page.getByRole('dialog')).toContainText(
    'An unofficial, non-commercial offline companion',
  )
})
