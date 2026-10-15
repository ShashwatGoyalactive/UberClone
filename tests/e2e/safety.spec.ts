import { expect, test } from "@playwright/test";

/**
 * Safety (docs/TESTING.md §5): a rider shares a live trip that a stranger
 * opens without an account, and raises an SOS that survives a reload and
 * ends only with the PIN. Far from the other tests' Pilots (Devanahalli
 * and Bidadi), so the simulated Pilot takes the ride.
 */

const SPOTS = {
  mobile: { latitude: 13.2437, longitude: 77.7172 },
  desktop: { latitude: 12.7975, longitude: 77.4232 },
} as const;

test("share a live trip, then raise and end an SOS", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const spot = SPOTS[testInfo.project.name as keyof typeof SPOTS];
  const context = await browser.newContext({ geolocation: spot, permissions: ["geolocation"] });
  const page = await context.newPage();

  await page.goto("/demo?role=rider");
  await page.getByRole("button", { name: "Start riding" }).click();
  await page.getByRole("link", { name: "Where to?" }).click();
  await page.getByLabel("Destination").fill("mg road");
  await page.getByRole("button", { name: /MG Road/ }).click();
  await page.getByRole("button", { name: "Book Comet Go" }).click();
  await expect(page.getByRole("heading", { name: "Your Pilot is on the way" })).toBeVisible({
    timeout: 20_000,
  });
  const code = (await page.getByTestId("ride-code").textContent())!.trim();

  // Share: a signed-out stranger sees the trip, and nothing private.
  await page.getByRole("button", { name: "Share trip" }).click();
  const url = (await page.getByTestId("share-url").textContent())!.trim();
  expect(url).toMatch(/\/t\/[A-Za-z0-9_-]{43}$/);
  const stranger = await browser.newContext();
  const shared = await stranger.newPage();
  await shared.goto(url);
  await expect(shared.getByText("Aarav shared their trip with you")).toBeVisible();
  await expect(shared.getByTestId("share-pilot")).toContainText("Rohan K.");
  await expect(shared.getByText("KA 05 MX 2841")).toBeVisible();
  await expect(shared.locator("body")).not.toContainText(code);
  await shared.goto(url.replace(/.{4}$/, "AAAA"));
  await expect(shared.getByRole("heading", { name: "This link isn't working" })).toBeVisible();
  await stranger.close();

  // SOS: cancelling during the countdown sends nothing.
  await page.getByRole("button", { name: "SOS" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Sending an alert in");
  await page.getByRole("button", { name: "Cancel — I tapped by mistake" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);

  // Send it now; it's still active after a reload.
  await page.getByRole("button", { name: "SOS" }).click();
  await page.getByRole("button", { name: "Send SOS alert now" }).click();
  await expect(page.getByRole("heading", { name: "Help is on the way" })).toBeVisible();
  await page.getByRole("button", { name: "Call 112 · Police" }).click();
  await expect(page.getByRole("dialog", { name: "Call from your phone" })).toBeVisible();
  await page.getByRole("button", { name: "OK" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Help is on the way" })).toBeVisible();

  // Ending needs the PIN.
  await page.getByRole("button", { name: "I'm safe now · enter PIN to end" }).click();
  const pin = page.getByLabel("Enter your 4-digit safety PIN");
  await pin.pressSequentially("0000");
  await page.getByRole("button", { name: "End SOS" }).click();
  await expect(page.getByText("That PIN doesn't match. Try again.")).toBeVisible();
  await pin.pressSequentially("1234");
  await page.getByRole("button", { name: "End SOS" }).click();
  await expect(page.getByRole("heading", { name: "Help is on the way" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Help is on the way" })).toHaveCount(0);
  await context.close();
});
