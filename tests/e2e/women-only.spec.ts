import { expect, test } from "@playwright/test";

/**
 * Women-only rides (docs/PRD.md F4): a rider verifies (simulated), turns on
 * "Women Pilots only", and her demo ride gets a woman simulated Pilot. A
 * Pilot turns on "Women passengers only". Far from other tests' Pilots
 * (Hoskote road and Kanakapura road).
 */

const SPOTS = {
  mobile: { latitude: 13.1, longitude: 77.86 },
  desktop: { latitude: 12.69, longitude: 77.5 },
} as const;

const goToAccount = (page: import("@playwright/test").Page) =>
  page
    .getByRole("link", { name: /^(Account|Pilot account)$/ })
    .filter({ visible: true })
    .first()
    .click();

test("a verified rider books a women-only ride", async ({ browser }, testInfo) => {
  test.setTimeout(60_000);
  const spot = SPOTS[testInfo.project.name as keyof typeof SPOTS];
  const context = await browser.newContext({ geolocation: spot, permissions: ["geolocation"] });
  const page = await context.newPage();

  await page.goto("/demo?role=rider");
  await page.getByRole("button", { name: "Start riding" }).click();
  await expect(page).toHaveURL(/\/ride$/);
  await goToAccount(page);
  await page.getByRole("link", { name: /Women Pilots only/ }).click();

  // Not verified yet: the switch isn't offered, only the (simulated) check.
  await expect(page.getByRole("switch")).toHaveCount(0);
  await page.getByRole("button", { name: "Verify my profile (simulated)" }).click();
  await expect(page.getByText(/Your profile is verified \(simulated\)/)).toBeVisible();
  const riderSwitch = page.getByRole("switch", { name: /Women Pilots only/ });
  await riderSwitch.setChecked(true, { force: true });
  await expect(riderSwitch).toBeChecked();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  await page.goto("/ride/plan");
  await page.getByLabel("Destination").fill("mg road");
  await page.getByRole("button", { name: /MG Road/ }).click();
  // On by default, from the saved preference.
  await expect(page.getByRole("switch", { name: /Women Pilots only/ })).toBeChecked();
  await page.getByRole("button", { name: "Book Comet Go" }).click();
  await expect(page.getByText("Women Pilots only", { exact: true })).toBeVisible();
  await expect(page.getByTestId("pilot-name")).toHaveText("Priya Sharma", { timeout: 20_000 });
  await context.close();
});

test("a verified Pilot turns on women passengers only", async ({ page }) => {
  await page.goto("/demo?role=pilot");
  await page.getByRole("button", { name: "Start driving" }).click();
  await expect(page).toHaveURL(/\/pilot$/);
  await goToAccount(page);
  await page.getByRole("link", { name: /Women passengers only/ }).click();
  await page.getByRole("button", { name: "Verify my profile (simulated)" }).click();
  const pilotSwitch = page.getByRole("switch", { name: /Women passengers only/ });
  await pilotSwitch.setChecked(true, { force: true });
  await expect(pilotSwitch).toBeChecked();
  await page.getByRole("radio", { name: "Night only · 9 pm–6 am" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("switch", { name: /Women passengers only/ })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Night only · 9 pm–6 am" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
