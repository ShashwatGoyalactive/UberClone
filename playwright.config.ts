import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a production build (`next build && next
 * start`), not the dev server, so they exercise what actually ships.
 *
 * COMET_FAKE_EXTERNALS swaps Mapbox and Razorpay for deterministic fakes
 * behind the same interfaces (docs/TESTING.md); it's never set in a real
 * deployment.
 */
const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run build && npx next start -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { COMET_FAKE_EXTERNALS: "1" },
  },
});
