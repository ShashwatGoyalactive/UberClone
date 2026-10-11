import { expect, test } from "@playwright/test";

/**
 * Wallet top-up through the fake gateway (docs/TESTING.md §5, "wallet
 * top-up"): the balance rises once and survives a reload; a failed
 * payment leaves it unchanged.
 */

test("adds money once, and a failed payment changes nothing", async ({ page }) => {
  await page.goto("/demo?role=rider");
  await page.getByRole("button", { name: "Start riding" }).click();
  await expect(page).toHaveURL(/\/ride$/);

  await page.getByRole("link", { name: "Wallet" }).click();
  const balance = page.getByTestId("wallet-balance");
  await expect(balance).toHaveText("₹1,240.00");

  await page.getByRole("radio", { name: "+ ₹500" }).click();
  await page.getByRole("button", { name: "Add ₹500" }).click();
  const checkout = page.getByRole("dialog", { name: "Comet test checkout" });
  await expect(checkout).toBeVisible();
  await checkout.getByRole("button", { name: "Pay ₹500" }).click();
  await expect(page.getByText("₹500 added to your wallet.")).toBeVisible();
  await expect(balance).toHaveText("₹1,740.00");
  await expect(
    page.getByRole("list", { name: "Transactions" }).getByText("Added money"),
  ).toBeVisible();

  await page.reload();
  await expect(balance).toHaveText("₹1,740.00");

  await page.getByLabel("Other amount in rupees").fill("250");
  await page.getByRole("button", { name: "Add ₹250" }).click();
  await checkout.getByRole("button", { name: "Simulate a failed payment" }).click();
  await expect(page.getByText("Payment didn't go through. No money was taken.")).toBeVisible();
  await expect(balance).toHaveText("₹1,740.00");

  // Below the minimum, the button stays off.
  await page.getByLabel("Other amount in rupees").fill("20");
  await expect(page.getByText("Add between ₹50 and ₹10,000.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Add money" })).toBeDisabled();
});
