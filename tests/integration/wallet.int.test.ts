import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { SIM_CASH_CONFIRM_S, SIM_TOTAL_S } from "@/lib/demo-sim";
import { splitFare } from "@/lib/fares";
import type { LatLng } from "@/lib/geo";
import { FAKE_WEBHOOK_SECRET } from "@/lib/razorpay/fake";
import { hmacHex } from "@/lib/razorpay/signatures";
import { walletBalance } from "@/lib/repositories/wallet";
import { setUpDemo } from "@/lib/services/accounts";
import { tickDemoRide } from "@/lib/services/demo-sim";
import { getEarnings } from "@/lib/services/earnings";
import {
  chooseRidePayment,
  confirmCashPayment,
  createRidePaymentOrder,
} from "@/lib/services/payments";
import { acceptOffer, goOnline, listOpenOffers } from "@/lib/services/pilots";
import { quoteFare } from "@/lib/services/quotes";
import { bookRide } from "@/lib/services/rides";
import { endTrip, markArrived, startTrip } from "@/lib/services/trips";
import {
  createTopUpOrder,
  fakeCheckoutPay,
  getWallet,
  handleWebhook,
  requestPayout,
  verifyCheckout,
} from "@/lib/services/wallet";
import { DEMO_WALLET_GRANT } from "@/lib/wallet";

/** Money against a real database: the ledger, top-ups, ride payments, payouts. */

const KORAMANGALA: LatLng = { lat: 12.9352, lng: 77.6245 };
const MG_ROAD: LatLng = { lat: 12.9756, lng: 77.6066 };
const anon = () => ({ id: randomUUID(), email: null, isAnonymous: true });

beforeAll(() => {
  process.env.COMET_FAKE_EXTERNALS = "1";
});
afterAll(async () => {
  await db.$disconnect();
});

const rider = async () => (await setUpDemo(anon(), "rider")).id;

async function topUp(userId: string, amountPaise: number) {
  const order = await createTopUpOrder(userId, amountPaise);
  const paid = await fakeCheckoutPay(userId, order.orderId);
  await verifyCheckout(userId, paid);
  return paid;
}

/** A completed ride between a fresh rider and a real Pilot. */
async function completedRide(paymentMethod: "wallet" | "upi" | "card" | "cash", riderId?: string) {
  await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
  const pilotId = (await setUpDemo(anon(), "pilot")).id;
  await goOnline(pilotId, KORAMANGALA);
  const rId = riderId ?? (await rider());
  const q = await quoteFare(
    rId,
    { address: "Koramangala", point: KORAMANGALA },
    { address: "MG Road", point: MG_ROAD },
  );
  const { rideId } = await bookRide(rId, { quoteId: q.quoteId, tier: "go", paymentMethod });
  await acceptOffer(pilotId, (await listOpenOffers(pilotId))[0]!.offerId);
  const { rideCode } = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
  await markArrived(pilotId, rideId);
  await startTrip(pilotId, rideId, rideCode);
  await endTrip(pilotId, rideId);
  const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
  return { pilotId, riderId: rId, rideId, ride };
}

describe("the ledger", () => {
  it("gives a demo rider ₹1,240 once, however many times the demo is opened", async () => {
    const identity = anon();
    await setUpDemo(identity, "rider");
    await setUpDemo(identity, "rider");
    await setUpDemo(identity, "pilot");
    expect(await walletBalance(identity.id)).toBe(DEMO_WALLET_GRANT);
    const wallet = await getWallet(identity.id);
    expect(wallet.entries).toHaveLength(1);
    expect(wallet.entries[0]).toMatchObject({ title: "Welcome credit", kind: "demo_grant" });
  });

  it("rejects editing or deleting an entry", async () => {
    const id = await rider();
    await expect(
      db.$executeRaw`UPDATE wallet_entries SET amount_paise = 999999 WHERE user_id = ${id}::uuid`,
    ).rejects.toThrow(/append-only/);
    await expect(
      db.$executeRaw`DELETE FROM wallet_entries WHERE user_id = ${id}::uuid`,
    ).rejects.toThrow(/append-only/);
    expect(await walletBalance(id)).toBe(DEMO_WALLET_GRANT);
  });

  it("rejects a zero amount", async () => {
    const id = await rider();
    await expect(
      db.walletEntry.create({
        data: { userId: id, amountPaise: 0, kind: "topup", idempotencyKey: randomUUID() },
      }),
    ).rejects.toThrow();
  });
});

describe("top-ups", () => {
  it("credits a verified payment exactly once, even when verified again and replayed by the webhook", async () => {
    const id = await rider();
    const paid = await topUp(id, 50_000);
    await verifyCheckout(id, paid); // a page reload re-sends the callback
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: paid.paymentId, order_id: paid.orderId } } },
    });
    const signature = hmacHex(FAKE_WEBHOOK_SECRET, body);
    expect(await handleWebhook(body, signature)).toBe(true);
    expect(await handleWebhook(body, signature)).toBe(true);
    expect(await walletBalance(id)).toBe(DEMO_WALLET_GRANT + 50_000);
    const payment = await db.payment.findUniqueOrThrow({
      where: { razorpayOrderId: paid.orderId },
    });
    expect(payment.status).toBe("paid");
  });

  it("credits through the webhook alone when the browser never came back", async () => {
    const id = await rider();
    const order = await createTopUpOrder(id, 20_000);
    const { paymentId } = await fakeCheckoutPay(id, order.orderId);
    const body = JSON.stringify({
      event: "payment.captured",
      payload: { payment: { entity: { id: paymentId, order_id: order.orderId } } },
    });
    await handleWebhook(body, hmacHex(FAKE_WEBHOOK_SECRET, body));
    expect(await walletBalance(id)).toBe(DEMO_WALLET_GRANT + 20_000);
  });

  it("refuses a forged signature and credits nothing", async () => {
    const id = await rider();
    const order = await createTopUpOrder(id, 50_000);
    const paid = await fakeCheckoutPay(id, order.orderId);
    await expect(verifyCheckout(id, { ...paid, signature: "0".repeat(64) })).rejects.toMatchObject({
      code: "PAYMENT_FAILED",
    });
    expect(await walletBalance(id)).toBe(DEMO_WALLET_GRANT);
  });

  it("refuses a webhook with a bad signature", async () => {
    const body = JSON.stringify({ event: "payment.captured", payload: {} });
    expect(await handleWebhook(body, "f".repeat(64))).toBe(false);
    expect(await handleWebhook(body, "")).toBe(false);
  });

  it("won't let one user verify another user's order", async () => {
    const owner = await rider();
    const other = await rider();
    const order = await createTopUpOrder(owner, 50_000);
    const paid = await fakeCheckoutPay(owner, order.orderId);
    await expect(verifyCheckout(other, paid)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(fakeCheckoutPay(other, order.orderId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    expect(await walletBalance(other)).toBe(DEMO_WALLET_GRANT);
  });

  it("only allows ₹50 to ₹10,000", async () => {
    const id = await rider();
    await expect(createTopUpOrder(id, 4_999)).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(createTopUpOrder(id, 1_000_001)).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("paying for rides", () => {
  it("charges a wallet ride once when it ends and pays the Pilot minus Comet's 15%", async () => {
    const { riderId, pilotId, ride } = await completedRide("wallet");
    expect(ride.paymentStatus).toBe("paid");
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT - ride.totalPaise);
    const { platformFee } = splitFare(ride.farePaise);
    expect(ride.platformFeePaise).toBe(platformFee);
    expect(await walletBalance(pilotId)).toBe(ride.farePaise - platformFee);

    // Retrying the charge changes nothing.
    await expect(chooseRidePayment(riderId, ride.id, "wallet")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT - ride.totalPaise);
  });

  it("refuses to book on a wallet that can't cover the fare", async () => {
    const id = await rider();
    await requestPayoutFromRider(id);
    const q = await quoteFare(
      id,
      { address: "Koramangala", point: KORAMANGALA },
      { address: "MG Road", point: MG_ROAD },
    );
    await expect(
      bookRide(id, { quoteId: q.quoteId, tier: "go", paymentMethod: "wallet" }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
  });

  it("marks a wallet ride failed when the balance runs short, then takes cash instead", async () => {
    const id = await rider();
    // Book while the wallet covers it, then empty it before the trip ends.
    const pending = completedRideAfterDraining(id);
    const { pilotId, ride } = await pending;
    expect(ride.paymentStatus).toBe("failed");
    expect(await walletBalance(id)).toBe(0);

    await chooseRidePayment(id, ride.id, "cash");
    await confirmCashPayment(pilotId, ride.id, ride.totalPaise, false);
    const after = await db.ride.findUniqueOrThrow({ where: { id: ride.id } });
    expect(after).toMatchObject({ paymentStatus: "paid", paymentMethod: "cash" });
    expect(await walletBalance(id)).toBe(0);
  });

  it("settles cash with change credited to the rider's wallet", async () => {
    const { riderId, pilotId, ride } = await completedRide("cash");
    expect(ride.paymentStatus).toBe("pending");
    const received = ride.totalPaise + 5_200;
    const { changeCreditedPaise } = await confirmCashPayment(pilotId, ride.id, received, true);
    expect(changeCreditedPaise).toBe(5_200);
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT + 5_200);
    // The Pilot holds the cash: their wallet owes Comet's fee and the change.
    expect(await walletBalance(pilotId)).toBe(-ride.platformFeePaise - 5_200);
    // A second tap is refused.
    await expect(confirmCashPayment(pilotId, ride.id, received, true)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("refuses less than the fare, an implausible amount, or the wrong Pilot", async () => {
    const { pilotId, ride } = await completedRide("cash");
    await expect(
      confirmCashPayment(pilotId, ride.id, ride.totalPaise - 100, false),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    await expect(
      confirmCashPayment(pilotId, ride.id, ride.totalPaise + 50_100, true),
    ).rejects.toMatchObject({ code: "VALIDATION" });
    const stranger = (await setUpDemo(anon(), "pilot")).id;
    await expect(
      confirmCashPayment(stranger, ride.id, ride.totalPaise, false),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("pays a UPI ride online and refunds a second payment if cash was taken meanwhile", async () => {
    const { riderId, pilotId, ride } = await completedRide("upi");
    expect(ride.paymentStatus).toBe("pending");

    const order = await createRidePaymentOrder(riderId, ride.id);
    expect(order.amountPaise).toBe(ride.totalPaise);
    const paid = await fakeCheckoutPay(riderId, order.orderId);
    await verifyCheckout(riderId, paid);
    const after = await db.ride.findUniqueOrThrow({ where: { id: ride.id } });
    expect(after).toMatchObject({ paymentStatus: "paid", paymentMethod: "upi" });
    expect(await walletBalance(pilotId)).toBe(ride.farePaise - ride.platformFeePaise);
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT);

    // A second order can't be created for a paid ride.
    await expect(createRidePaymentOrder(riderId, ride.id)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("refunds an online payment that lands after the Pilot took cash", async () => {
    const { riderId, pilotId, ride } = await completedRide("upi");
    const order = await createRidePaymentOrder(riderId, ride.id);
    await confirmCashPayment(pilotId, ride.id, ride.totalPaise, false);
    const paid = await fakeCheckoutPay(riderId, order.orderId);
    await verifyCheckout(riderId, paid);
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT + ride.totalPaise);
  });

  it("only lets the ride's own rider pay or switch method", async () => {
    const { ride } = await completedRide("upi");
    const stranger = await rider();
    await expect(createRidePaymentOrder(stranger, ride.id)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(chooseRidePayment(stranger, ride.id, "cash")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("lets the simulated Pilot collect cash after the drop", async () => {
    const riderId = await rider();
    const q = await quoteFare(
      riderId,
      { address: "Koramangala", point: KORAMANGALA },
      { address: "MG Road", point: MG_ROAD },
    );
    const { rideId } = await bookRide(riderId, {
      quoteId: q.quoteId,
      tier: "go",
      paymentMethod: "cash",
    });
    const { requestedAt } = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    const at = (s: number) => new Date(requestedAt.getTime() + s * 1000);
    await tickDemoRide(riderId, rideId, at(SIM_TOTAL_S + 1));
    expect((await tickDemoRide(riderId, rideId, at(SIM_TOTAL_S + 2))).paymentStatus).toBe(
      "pending",
    );
    const view = await tickDemoRide(riderId, rideId, at(SIM_TOTAL_S + SIM_CASH_CONFIRM_S + 1));
    expect(view).toMatchObject({ status: "completed", paymentStatus: "paid" });
  });
});

describe("Pilot earnings and payouts", () => {
  it("shows today's earnings and withdraws the balance once", async () => {
    const { pilotId, ride } = await completedRide("wallet");
    const earnings = await getEarnings(pilotId);
    const share = ride.farePaise - ride.platformFeePaise;
    expect(earnings.days).toHaveLength(7);
    expect(earnings.days.at(-1)).toMatchObject({ earnedPaise: share, trips: 1 });
    expect(earnings.weekPaise).toBe(share);
    expect(earnings.wallet.balancePaise).toBe(share);

    const requestId = randomUUID();
    await requestPayout(pilotId, share, requestId);
    await requestPayout(pilotId, share, requestId); // a double tap
    expect(await walletBalance(pilotId)).toBe(0);
    expect(await db.payout.count({ where: { pilotId } })).toBe(1);
  });

  it("never lets two withdrawals at once overdraw", async () => {
    const { pilotId, ride } = await completedRide("wallet");
    const share = ride.farePaise - ride.platformFeePaise;
    const results = await Promise.allSettled([
      requestPayout(pilotId, share, randomUUID()),
      requestPayout(pilotId, share, randomUUID()),
      requestPayout(pilotId, share, randomUUID()),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await walletBalance(pilotId)).toBe(0);
    expect(await db.payout.count({ where: { pilotId } })).toBe(1);
  });
});

/** Empties a rider's wallet through the same overdraft-proof debit payouts use. */
async function requestPayoutFromRider(riderId: string) {
  await requestPayout(riderId, await walletBalance(riderId), randomUUID());
}

/** Books a wallet ride, then drains the wallet before the trip ends. */
async function completedRideAfterDraining(riderId: string) {
  await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
  const pilotId = (await setUpDemo(anon(), "pilot")).id;
  await goOnline(pilotId, KORAMANGALA);
  const q = await quoteFare(
    riderId,
    { address: "Koramangala", point: KORAMANGALA },
    { address: "MG Road", point: MG_ROAD },
  );
  const { rideId } = await bookRide(riderId, {
    quoteId: q.quoteId,
    tier: "go",
    paymentMethod: "wallet",
  });
  await acceptOffer(pilotId, (await listOpenOffers(pilotId))[0]!.offerId);
  const { rideCode } = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
  await markArrived(pilotId, rideId);
  await startTrip(pilotId, rideId, rideCode);
  await requestPayoutFromRider(riderId);
  await endTrip(pilotId, rideId);
  return { pilotId, ride: await db.ride.findUniqueOrThrow({ where: { id: rideId } }) };
}
