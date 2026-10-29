import { defineConfig, devices } from '@playwright/test'

const chromium = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 8_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    locale: 'en-US',
    viewport: { width: 960, height: 900 },
    launchOptions: { executablePath: chromium },
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: chromium },
      },
    },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
