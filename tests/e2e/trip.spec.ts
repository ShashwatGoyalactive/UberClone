import { expect, test, type Browser } from "@playwright/test";

/**
 * Phase 5 critical flows (docs/TESTING.md §5):
 * - a demo rider completes a whole ride alone, driven by the simulated Pilot;
 * - with two browsers, a real Pilot arrives, starts with the rider's code,
 *   and ends the trip.
 *
 * Each test uses its own part of Bengaluru, more than 5 km from the
 * others, so parallel runs can't be matched to each other's Pilots.
 */

const SPOTS = {
  "demo-mobile": { latitude: 12.8399, longitude: 77.677 }, // Electronic City
  "demo-desktop": { latitude: 13.0285, longitude: 77.5197 }, // Yeshwanthpur
  "real-mobile": { latitude: 12.9592, longitude: 77.6974 }, // Marathahalli
  "real-desktop": { latitude: 13.0827, longitude: 77.5877 }, // Yelahanka
} as const;

async function at(browser: Browser, spot: { latitude: number; longitude: number }) {
  const context = await browser.newContext({ geolocation: spot, permissions: ["geolocation"] });
  return { context, page: await context.newPage() };
}

async function bookFromCurrentLocation(page: import("@playwright/test").Page) {
  await page.goto("/demo?role=rider");
  await page.getByRole("button", { name: "Start riding" }).click();
  await expect(page).toHaveURL(/\/ride$/);
  await page.getByRole("link", { name: "Where to?" }).click();
  await page.getByLabel("Destination").fill("mg road");
  await page.getByRole("button", { name: /MG Road/ }).click();
  await page.getByRole("button", { name: "Book Comet Go" }).click();
  await expect(page).toHaveURL(/\/ride\/trip$/);
}

test("a demo rider completes a whole ride with the simulated Pilot", async ({
  browser,
}, testInfo) => {
  test.setTimeout(150_000);
  const spot = SPOTS[`demo-${testInfo.project.name}` as keyof typeof SPOTS];
  const { context, page } = await at(browser, spot);

  await bookFromCurrentLocation(page);
  await expect(page.getByRole("heading", { name: "Finding your Pilot…" })).toBeVisible();

  await expect(page.getByRole("heading", { name: "Your Pilot is on the way" })).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByTestId("pilot-name")).toHaveText("Rohan Kumar");
  await expect(page.getByTestId("ride-code")).toHaveText(/^\d{4}$/);
  await expect(page.getByTestId("car-marker")).toBeAttached();

  await expect(page.getByRole("heading", { name: "Your Pilot has arrived" })).toBeVisible({
    timeout: 45_000,
  });
  await expect(page.getByRole("heading", { name: /Heading to/ })).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("heading", { name: "You've arrived" })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByTestId("trip-total")).toHaveText(/^₹[\d,]+$/);

  await page.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/ride$/);
  await expect(page.getByText("Your ride is in progress")).toHaveCount(0);
  await context.close();
});

test("a real Pilot arrives, starts with the rider's code, and ends the trip", async ({
  browser,
}, testInfo) => {
  test.setTimeout(90_000);
  const spot = SPOTS[`real-${testInfo.project.name}` as keyof typeof SPOTS];
  const pilot = await at(browser, spot);
  const rider = await at(browser, spot);

  await pilot.page.goto("/demo?role=pilot");
  await pilot.page.getByRole("button", { name: "Start driving" }).click();
  await pilot.page.getByRole("button", { name: "Go online" }).click();
  await expect(pilot.page.getByRole("button", { name: "You're online" })).toBeVisible();

  await bookFromCurrentLocation(rider.page);
  // Accept before the rider's simulated Pilot steps in (it waits 6 seconds).
  const request = pilot.page.getByRole("article", { name: /Ride request/ });
  await expect(request).toBeVisible({ timeout: 5_000 });
  await request.getByRole("button", { name: "Accept" }).click();
  await expect(pilot.page.getByRole("heading", { name: "Head to pickup" })).toBeVisible();

  const code = (await rider.page.getByTestId("ride-code").textContent({ timeout: 10_000 }))!.trim();
  await pilot.page.getByRole("button", { name: "I've arrived" }).click();
  await expect(rider.page.getByRole("heading", { name: "Your Pilot has arrived" })).toBeVisible({
    timeout: 10_000,
  });

  // A wrong code first, then the right one.
  const wrong = code === "0000" ? "1111" : "0000";
  await pilot.page.getByLabel("Ask the rider for their 4-digit code").pressSequentially(wrong);
  await pilot.page.getByRole("button", { name: "Start trip" }).click();
  await expect(pilot.page.getByText(/4 tries left/)).toBeVisible();
  const codeInput = pilot.page.getByLabel("Ask the rider for their 4-digit code");
  await expect(codeInput).toBeEnabled();
  await expect(codeInput).toHaveValue("");
  await codeInput.pressSequentially(code);
  await pilot.page.getByRole("button", { name: "Start trip" }).click();
  await expect(pilot.page.getByRole("heading", { name: "On trip" })).toBeVisible();
  await expect(rider.page.getByRole("heading", { name: /Heading to/ })).toBeVisible({
    timeout: 10_000,
  });

  await pilot.page.getByRole("button", { name: "End trip" }).click();
  await expect(pilot.page.getByRole("heading", { name: "Trip complete" })).toBeVisible();
  const collect = await pilot.page.getByTestId("collect-total").textContent();
  await expect(rider.page.getByRole("heading", { name: "You've arrived" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(rider.page.getByTestId("trip-total")).toHaveText(collect!);

  await pilot.page.getByRole("button", { name: "Back to requests" }).click();
  await expect(pilot.page).toHaveURL(/\/pilot$/);
  await pilot.context.close();
  await rider.context.close();
});
