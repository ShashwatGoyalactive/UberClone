import { expect, test, type Browser } from "@playwright/test";

/**
 * Phase 4 critical flow, with two real browsers: a demo Pilot goes online,
 * a demo rider books, the Pilot sees the request and accepts, and the
 * rider sees their Pilot, car and ride code.
 *
 * Each test (and each Playwright project running it in parallel) places
 * its rider and Pilot in a different part of Bengaluru, more than the
 * 5 km matching radius apart, so parallel runs can't match each other.
 */

const SPOTS = {
  mobile: { latitude: 12.9116, longitude: 77.6474 }, // HSR Layout
  desktop: { latitude: 12.9698, longitude: 77.75 }, // Whitefield
  "mobile-cancel": { latitude: 13.0358, longitude: 77.597 }, // Hebbal
  "desktop-cancel": { latitude: 12.925, longitude: 77.5838 }, // Jayanagar
} as const;

async function contextAt(browser: Browser, spot: { latitude: number; longitude: number }) {
  const context = await browser.newContext({ geolocation: spot, permissions: ["geolocation"] });
  return { context, page: await context.newPage() };
}

test("a rider books, a nearby Pilot accepts, and the rider sees their Pilot", async ({
  browser,
}, testInfo) => {
  const spot = SPOTS[testInfo.project.name as "mobile" | "desktop"];
  const pilot = await contextAt(browser, spot);
  const rider = await contextAt(browser, spot);

  // Pilot goes online.
  await pilot.page.goto("/demo?role=pilot");
  await pilot.page.getByRole("button", { name: "Start driving" }).click();
  await expect(pilot.page).toHaveURL(/\/pilot$/);
  await pilot.page.getByRole("button", { name: "Go online" }).click();
  await expect(pilot.page.getByRole("button", { name: "You're online" })).toBeVisible();

  // Rider books Comet Go, with the simulated Pilot off so only the real one can accept.
  await rider.page.goto("/demo?role=rider");
  await rider.page.getByText("Simulated Pilot", { exact: true }).click();
  await expect(rider.page.getByRole("switch", { name: /Simulated Pilot/ })).not.toBeChecked();
  await rider.page.getByRole("button", { name: "Start riding" }).click();
  await expect(rider.page).toHaveURL(/\/ride$/);
  await rider.page.getByRole("link", { name: "Where to?" }).click();
  await rider.page.getByLabel("Destination").fill("airport");
  await rider.page.getByRole("button", { name: /Terminal 1/ }).click();
  await rider.page.getByRole("button", { name: "Book Comet Go" }).click();
  await expect(rider.page).toHaveURL(/\/ride\/trip$/);
  await expect(rider.page.getByRole("heading", { name: "Finding your Pilot…" })).toBeVisible();

  // The Pilot sees the request and accepts it.
  const request = pilot.page.getByRole("article", { name: /Ride request/ });
  await expect(request).toBeVisible({ timeout: 10_000 });
  await expect(request).toContainText("Comet Go");
  await expect(request).toContainText("Terminal 1");
  await request.getByRole("button", { name: "Accept" }).click();
  await expect(pilot.page).toHaveURL(/\/pilot\/trip$/);
  await expect(pilot.page.getByRole("heading", { name: "Head to pickup" })).toBeVisible();
  // The Pilot never sees the ride code.
  await expect(pilot.page.getByTestId("ride-code")).toHaveCount(0);

  // The rider sees the Pilot, the car and their code.
  await expect(rider.page.getByRole("heading", { name: "Your Pilot is on the way" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(rider.page.getByTestId("pilot-name")).toHaveText("Rohan Kumar");
  await expect(rider.page.getByText("KA 05 MX 2841")).toBeVisible();
  await expect(rider.page.getByTestId("ride-code")).toHaveText(/^\d{4}$/);

  // Cancelling with a Pilot on the way asks first; within 3 minutes it's free.
  await rider.page.getByRole("button", { name: "Cancel ride" }).click();
  const sheet = rider.page.getByRole("dialog", { name: "Cancel this ride?" });
  await expect(sheet.getByText("Cancelling now is free.")).toBeVisible();
  await sheet.getByRole("button", { name: "Keep my ride" }).click();
  await expect(sheet).toHaveCount(0);
  await rider.page.getByRole("button", { name: "Cancel ride" }).click();
  await sheet.getByRole("radio", { name: "My plans changed" }).click();
  await sheet.getByRole("button", { name: "Cancel · free" }).click();
  await expect(rider.page.getByText("Your ride was cancelled. You weren't charged.")).toBeVisible();
  await expect(pilot.page.getByText("The rider cancelled.")).toBeVisible({ timeout: 10_000 });

  await pilot.context.close();
  await rider.context.close();
});

test("a rider can cancel while waiting and is told it was free", async ({ browser }, testInfo) => {
  const spot = SPOTS[`${testInfo.project.name}-cancel` as "mobile-cancel" | "desktop-cancel"];
  const rider = await contextAt(browser, spot);
  await rider.page.goto("/demo?role=rider");
  await rider.page.getByRole("button", { name: "Start riding" }).click();
  await expect(rider.page).toHaveURL(/\/ride$/);
  await rider.page.getByRole("link", { name: "Where to?" }).click();
  await rider.page.getByLabel("Destination").fill("koramangala");
  await rider.page.getByRole("button", { name: /Koramangala/ }).click();
  await rider.page.getByRole("button", { name: "Book Comet Go" }).click();
  await expect(rider.page.getByRole("heading", { name: "Finding your Pilot…" })).toBeVisible();

  await rider.page.getByRole("button", { name: "Cancel ride" }).click();
  await expect(rider.page.getByText("You weren't charged")).toBeVisible();
  await rider.page.getByRole("link", { name: "Back to home" }).click();
  await expect(rider.page.getByText("Finding your Pilot…")).toHaveCount(0);
  await rider.context.close();
});
