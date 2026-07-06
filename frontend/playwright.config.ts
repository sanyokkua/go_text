import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173';

export default defineConfig({
    testDir: './e2e',
    timeout: 30_000,
    retries: process.env.CI ? 1 : 0,
    workers: process.env.CI ? 1 : undefined,
    use: {
        baseURL: BASE_URL,
        screenshot: 'only-on-failure',
        video: 'off',
    },
    webServer: process.env.BASE_URL
        ? undefined
        : {
              command: 'npm run dev',
              url: 'http://localhost:5173',
              reuseExistingServer: !process.env.CI,
              timeout: 30_000,
          },
    outputDir: '.tmp/playwright-results',
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
});
