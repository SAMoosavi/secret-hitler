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
})
