import { expect, test, type Browser } from "@playwright/test";

/**
 * Critical flows (docs/TESTING.md §5):
 * - a demo rider completes a whole ride alone, driven by the simulated
 *   Pilot, and the wallet is charged exactly the total;
 * - with two browsers, a real Pilot arrives, starts with the rider's code,
 *   ends the trip, and collects cash with the change going to the wallet;
 * - a rider pays a finished ride by UPI through the test checkout.
 *
 * Each test uses its own part of Bengaluru, more than 5 km from the
 * others, so parallel runs can't be matched to each other's Pilots.
 */

const SPOTS = {
  "demo-mobile": { latitude: 12.8399, longitude: 77.677 }, // Electronic City
  "demo-desktop": { latitude: 13.0285, longitude: 77.5197 }, // Yeshwanthpur
  "real-mobile": { latitude: 12.9592, longitude: 77.6974 }, // Marathahalli
  "real-desktop": { latitude: 13.0827, longitude: 77.5877 }, // Yelahanka
  "upi-mobile": { latitude: 12.9081, longitude: 77.4851 }, // Kengeri
  "upi-desktop": { latitude: 13.0707, longitude: 77.7982 }, // Hoskote
} as const;

async function at(browser: Browser, spot: { latitude: number; longitude: number }) {
  const context = await browser.newContext({ geolocation: spot, permissions: ["geolocation"] });
  return { context, page: await context.newPage() };
}

type Pay = "Comet Wallet" | "UPI" | "Card" | "Cash";

async function bookFromCurrentLocation(page: import("@playwright/test").Page, pay?: Pay) {
  await page.goto("/demo?role=rider");
  await page.getByRole("button", { name: "Start riding" }).click();
  await expect(page).toHaveURL(/\/ride$/);
  await page.getByRole("link", { name: "Where to?" }).click();
  await page.getByLabel("Destination").fill("mg road");
  await page.getByRole("button", { name: /MG Road/ }).click();
  const payWith = page.getByRole("radiogroup", { name: "Pay with" });
  // The demo wallet covers a Go ride, so it's the default.
  await expect(payWith.getByRole("radio", { name: /Comet Wallet/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  if (pay) await payWith.getByRole("radio", { name: new RegExp(pay) }).click();
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
  const total = await page.getByTestId("trip-total").textContent();
  expect(total).toMatch(/^₹[\d,]+$/);
  await expect(page.getByText("Paid · Comet Wallet")).toBeVisible();

  await page.getByRole("link", { name: "Done" }).click();
  await expect(page).toHaveURL(/\/ride$/);
  await expect(page.getByText("Your ride is in progress")).toHaveCount(0);

  // Charged exactly the receipt total, once.
  const paise = Number(total!.replace(/[^\d]/g, "")) * 100;
  await page.getByRole("link", { name: "Wallet" }).click();
  await expect(page.getByTestId("wallet-balance")).toHaveText(
    `₹${((124_000 - paise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
  );
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

  await bookFromCurrentLocation(rider.page, "Cash");
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
  const collect = await pilot.page.getByTestId("collect-total").textContent();
  await expect(rider.page.getByText(/Waiting for Rohan to confirm/)).toBeVisible({
    timeout: 10_000,
  });
  await expect(rider.page.getByTestId("trip-total")).toHaveText(collect!);

  // The rider hands over a bigger note; the change goes to their wallet.
  const notes = pilot.page.getByRole("radiogroup", { name: "How much did the rider give you?" });
  await notes.getByRole("radio").nth(1).click();
  const change = (await pilot.page.getByTestId("change").textContent())!;
  expect(change).not.toBe("₹0");
  await pilot.page.getByRole("checkbox", { name: /Add .* to the rider's wallet/ }).check();
  await pilot.page.getByRole("button", { name: "Cash received" }).click();
  await expect(pilot.page.getByRole("heading", { name: "Trip complete" })).toBeVisible();
  await expect(pilot.page.getByText("Paid · Cash")).toBeVisible();

  await expect(rider.page.getByRole("heading", { name: "You've arrived" })).toBeVisible({
    timeout: 10_000,
  });
  await expect(rider.page.getByText("Paid · Cash")).toBeVisible();
  await rider.page.goto("/ride/wallet");
  const changePaise = Number(change.replace(/[^\d]/g, "")) * 100;
  await expect(rider.page.getByTestId("wallet-balance")).toHaveText(
    `₹${((124_000 + changePaise) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
  );

  // The Pilot's earnings show the trip.
  await pilot.page.getByRole("link", { name: "See earnings" }).click();
  await expect(pilot.page.getByRole("heading", { name: "Earnings" })).toBeVisible();
  await expect(
    pilot.page.getByRole("list", { name: "Recent trips" }).getByRole("listitem"),
  ).toHaveCount(1);
  await pilot.page.getByRole("link", { name: "Back" }).click();
  await expect(pilot.page).toHaveURL(/\/pilot$/);
  await pilot.context.close();
  await rider.context.close();
});

test("a rider pays a finished ride by UPI through checkout", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const spot = SPOTS[`upi-${testInfo.project.name}` as keyof typeof SPOTS];
  const pilot = await at(browser, spot);
  const rider = await at(browser, spot);

  await pilot.page.goto("/demo?role=pilot");
  await pilot.page.getByRole("button", { name: "Start driving" }).click();
  await pilot.page.getByRole("button", { name: "Go online" }).click();
  await expect(pilot.page.getByRole("button", { name: "You're online" })).toBeVisible();

  await bookFromCurrentLocation(rider.page, "UPI");
  const request = pilot.page.getByRole("article", { name: /Ride request/ });
  await expect(request).toBeVisible({ timeout: 5_000 });
  await request.getByRole("button", { name: "Accept" }).click();
  const code = (await rider.page.getByTestId("ride-code").textContent({ timeout: 10_000 }))!.trim();
  await pilot.page.getByRole("button", { name: "I've arrived" }).click();
  await pilot.page.getByLabel("Ask the rider for their 4-digit code").pressSequentially(code);
  await pilot.page.getByRole("button", { name: "Start trip" }).click();
  await pilot.page.getByRole("button", { name: "End trip" }).click();
  await expect(pilot.page.getByText(/Waiting for the rider to pay/)).toBeVisible();

  // A failed attempt first: nothing is taken, and the rider can retry.
  await expect(rider.page.getByRole("tab", { name: "UPI or card" })).toHaveAttribute(
    "aria-selected",
    "true",
    { timeout: 10_000 },
  );
  const total = (await rider.page.getByTestId("trip-total").textContent())!;
  await rider.page.getByRole("button", { name: `Pay ${total}` }).click();
  const checkout = rider.page.getByRole("dialog", { name: "Comet test checkout" });
  await checkout.getByRole("button", { name: "Simulate a failed payment" }).click();
  await expect(
    rider.page.getByText("Payment didn't go through. No money was taken."),
  ).toBeVisible();

  await rider.page.getByRole("button", { name: `Pay ${total}` }).click();
  await checkout.getByRole("button", { name: `Pay ${total}` }).click();
  await expect(rider.page.getByRole("heading", { name: "You've arrived" })).toBeVisible();
  await expect(rider.page.getByText("Paid · UPI")).toBeVisible();
  await expect(pilot.page.getByText("Paid · UPI")).toBeVisible({ timeout: 10_000 });
  await expect(pilot.page.getByTestId("trip-amount")).toHaveText(total);

  // The wallet wasn't touched: UPI paid it.
  await rider.page.goto("/ride/wallet");
  await expect(rider.page.getByTestId("wallet-balance")).toHaveText("₹1,240.00");
  await pilot.context.close();
  await rider.context.close();
});
