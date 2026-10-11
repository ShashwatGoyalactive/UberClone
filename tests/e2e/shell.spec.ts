import { expect, test } from "@playwright/test";

/**
 * Phase 1 smoke test: the shell renders with the Comet brand, follows the
 * system theme without a flash, and logs no errors. Replaced by the real
 * critical flows (docs/TESTING.md §5) as features land.
 */

test("landing renders the brand with no console errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rides at comet speed.");
  await expect(page.getByText("comet", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("follows a dark system theme before first paint", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(bg).toBe("rgb(10, 13, 24)");
  await context.close();
});

test("an explicit light choice overrides a dark system", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  await context.addInitScript(() => localStorage.setItem("comet-theme", "light"));
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.locator("html")).not.toHaveClass(/\bdark\b/);
  await context.close();
});
