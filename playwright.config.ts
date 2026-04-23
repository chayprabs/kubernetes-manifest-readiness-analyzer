import { defineConfig, devices } from "@playwright/test";

const playwrightPort = 3100;
const playwrightBaseUrl = `http://127.0.0.1:${playwrightPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "line" : "list",
  workers: 1,
  use: {
    baseURL: playwrightBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: `pnpm exec next dev --port ${playwrightPort}`,
    url: playwrightBaseUrl,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
