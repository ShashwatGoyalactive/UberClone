import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { CANCEL_FEE } from "@/lib/cancellation";
import { db } from "@/lib/db";
import type { LatLng } from "@/lib/geo";
import { walletBalance } from "@/lib/repositories/wallet";
import { setUpDemo } from "@/lib/services/accounts";
import { getReceipt, getRatingPrompt, listRides } from "@/lib/services/history";
import { acceptOffer, goOnline, listOpenOffers } from "@/lib/services/pilots";
import { quoteFare } from "@/lib/services/quotes";
import { rateRide } from "@/lib/services/ratings";
import { bookRide, cancelRideAsRider } from "@/lib/services/rides";
import { cancelAsNoShow, endTrip, markArrived, startTrip } from "@/lib/services/trips";
import { requestPayout } from "@/lib/services/wallet";
import { NO_SHOW_AFTER_S, NO_SHOW_FEE } from "@/lib/trip-fees";
import { DEMO_WALLET_GRANT } from "@/lib/wallet";

/** Ratings, tips, cancellation fees and ride history against a real database. */

const KORAMANGALA: LatLng = { lat: 12.9352, lng: 77.6245 };
const MG_ROAD: LatLng = { lat: 12.9756, lng: 77.6066 };
const anon = () => ({ id: randomUUID(), email: null, isAnonymous: true });
const later = (base: Date, s: number) => new Date(base.getTime() + s * 1000);

beforeAll(() => {
  process.env.COMET_FAKE_EXTERNALS = "1";
});
afterAll(async () => {
  await db.$disconnect();
});

/** A booked ride with a real Pilot who has accepted it. */
async function acceptedRide(paymentMethod: "wallet" | "cash" = "wallet", riderId?: string) {
  await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
  const pilotId = (await setUpDemo(anon(), "pilot")).id;
  await goOnline(pilotId, KORAMANGALA);
  const rId = riderId ?? (await setUpDemo(anon(), "rider")).id;
  const q = await quoteFare(
    rId,
    { address: "Koramangala", point: KORAMANGALA },
    { address: "MG Road", point: MG_ROAD },
  );
  const { rideId } = await bookRide(rId, { quoteId: q.quoteId, tier: "go", paymentMethod });
  await acceptOffer(pilotId, (await listOpenOffers(pilotId))[0]!.offerId);
  const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
  return { pilotId, riderId: rId, rideId, ride };
}

async function completedRide(riderId?: string) {
  const r = await acceptedRide("wallet", riderId);
  await markArrived(r.pilotId, r.rideId);
  await startTrip(r.pilotId, r.rideId, r.ride.rideCode);
  await endTrip(r.pilotId, r.rideId);
  return { ...r, ride: await db.ride.findUniqueOrThrow({ where: { id: r.rideId } }) };
}

describe("ratings", () => {
  it("rider rates once with a tip; the Pilot's average and wallet update together", async () => {
    const { riderId, pilotId, rideId, ride } = await completedRide();
    const pilotBefore = await walletBalance(pilotId);
    await rateRide(riderId, rideId, {
      stars: 4,
      tags: ["On time", "Not a real tag"],
      tipPaise: 2_000,
    });

    const rating = await db.rating.findFirstOrThrow({ where: { rideId, raterId: riderId } });
    expect(rating).toMatchObject({ rateeId: pilotId, stars: 4, tags: ["On time"] });
    const profile = await db.pilotProfile.findUniqueOrThrow({ where: { userId: pilotId } });
    expect(Number(profile.ratingAvg)).toBe(4);
    expect(profile.ratingCount).toBe(1);
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT - ride.totalPaise - 2_000);
    expect(await walletBalance(pilotId)).toBe(pilotBefore + 2_000);
    expect((await db.ride.findUniqueOrThrow({ where: { id: rideId } })).tipPaise).toBe(2_000);

    await expect(
      rateRide(riderId, rideId, { stars: 1, tags: [], tipPaise: 2_000 }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT - ride.totalPaise - 2_000);
  });

  it("keeps a running average across ratings", async () => {
    const pilotRides = await completedRide();
    await rateRide(pilotRides.riderId, pilotRides.rideId, { stars: 5, tags: [] });
    // The same Pilot, a second rider.
    const second = await setUpDemo(anon(), "rider");
    await goOnline(pilotRides.pilotId, KORAMANGALA);
    const q = await quoteFare(
      second.id,
      { address: "Koramangala", point: KORAMANGALA },
      { address: "MG Road", point: MG_ROAD },
    );
    const { rideId } = await bookRide(second.id, {
      quoteId: q.quoteId,
      tier: "go",
      paymentMethod: "wallet",
    });
    await acceptOffer(pilotRides.pilotId, (await listOpenOffers(pilotRides.pilotId))[0]!.offerId);
    const { rideCode } = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    await markArrived(pilotRides.pilotId, rideId);
    await startTrip(pilotRides.pilotId, rideId, rideCode);
    await endTrip(pilotRides.pilotId, rideId);
    await rateRide(second.id, rideId, { stars: 2, tags: [] });

    const profile = await db.pilotProfile.findUniqueOrThrow({
      where: { userId: pilotRides.pilotId },
    });
    expect(Number(profile.ratingAvg)).toBe(3.5);
    expect(profile.ratingCount).toBe(2);
  });

  it("the Pilot rates the rider, but can't tip", async () => {
    const { riderId, pilotId, rideId } = await completedRide();
    await expect(
      rateRide(pilotId, rideId, { stars: 5, tags: [], tipPaise: 1_000 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    await rateRide(pilotId, rideId, { stars: 5, tags: ["Polite", "Smooth driving"] });
    const rating = await db.rating.findFirstOrThrow({ where: { rideId, raterId: pilotId } });
    expect(rating).toMatchObject({ rateeId: riderId, tags: ["Polite"] });
    const profile = await db.riderProfile.findUniqueOrThrow({ where: { userId: riderId } });
    expect(Number(profile.ratingAvg)).toBe(5);
  });

  it("writes nothing when the wallet can't cover the tip", async () => {
    const { riderId, pilotId, rideId } = await completedRide();
    await requestPayout(riderId, await walletBalance(riderId), randomUUID());
    await expect(
      rateRide(riderId, rideId, { stars: 5, tags: [], tipPaise: 5_000 }),
    ).rejects.toMatchObject({ code: "INSUFFICIENT_BALANCE" });
    expect(await db.rating.count({ where: { rideId } })).toBe(0);
    const profile = await db.pilotProfile.findUniqueOrThrow({ where: { userId: pilotId } });
    expect(profile.ratingCount).toBe(0);
  });

  it("refuses a ride that isn't finished, or isn't yours", async () => {
    const { riderId, rideId } = await acceptedRide();
    await expect(rateRide(riderId, rideId, { stars: 5, tags: [] })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    const stranger = (await setUpDemo(anon(), "rider")).id;
    await expect(rateRide(stranger, rideId, { stars: 5, tags: [] })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("cancellation fees", () => {
  it("is free while searching", async () => {
    await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
    const riderId = (await setUpDemo(anon(), "rider")).id;
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
    const result = await cancelRideAsRider(
      riderId,
      rideId,
      "plans_changed",
      later(new Date(), 600),
    );
    expect(result).toEqual({ feePaise: 0, charged: "none" });
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT);
  });

  it("is free within 3 minutes of booking, even with a Pilot on the way", async () => {
    const { riderId, rideId, ride } = await acceptedRide();
    const result = await cancelRideAsRider(
      riderId,
      rideId,
      "plans_changed",
      later(ride.requestedAt, 170),
    );
    expect(result.feePaise).toBe(0);
    const after = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    expect(after).toMatchObject({ totalPaise: 0, paymentStatus: "waived" });
  });

  it("charges ₹25 after 3 minutes and pays it to the Pilot", async () => {
    const { riderId, pilotId, rideId, ride } = await acceptedRide();
    const result = await cancelRideAsRider(
      riderId,
      rideId,
      "too_long",
      later(ride.requestedAt, 200),
    );
    expect(result).toEqual({ feePaise: CANCEL_FEE, charged: "paid" });
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT - CANCEL_FEE);
    expect(await walletBalance(pilotId)).toBe(CANCEL_FEE);
    const after = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    expect(after).toMatchObject({
      cancellationFeePaise: CANCEL_FEE,
      totalPaise: CANCEL_FEE,
      paymentStatus: "paid",
      cancelReason: "Pilot is taking too long",
    });
  });

  it("waives the fee when the Pilot is at fault", async () => {
    const { riderId, rideId, ride } = await acceptedRide();
    const result = await cancelRideAsRider(
      riderId,
      rideId,
      "pilot_asked",
      later(ride.requestedAt, 600),
    );
    expect(result.feePaise).toBe(0);
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT);
  });

  it("waives a fee the wallet can't cover instead of leaving the rider in debt", async () => {
    const { riderId, pilotId, rideId, ride } = await acceptedRide("cash");
    await requestPayout(riderId, await walletBalance(riderId), randomUUID());
    const result = await cancelRideAsRider(
      riderId,
      rideId,
      "mistake",
      later(ride.requestedAt, 600),
    );
    expect(result).toEqual({ feePaise: CANCEL_FEE, charged: "waived" });
    expect(await walletBalance(riderId)).toBe(0);
    expect(await walletBalance(pilotId)).toBe(0);
  });

  it("pays the ₹40 no-show fee to the Pilot", async () => {
    const { riderId, pilotId, rideId } = await acceptedRide();
    const t0 = new Date();
    await markArrived(pilotId, rideId, t0);
    await cancelAsNoShow(pilotId, rideId, later(t0, NO_SHOW_AFTER_S + 1));
    expect(await walletBalance(riderId)).toBe(DEMO_WALLET_GRANT - NO_SHOW_FEE);
    expect(await walletBalance(pilotId)).toBe(NO_SHOW_FEE);
  });
});

describe("ride history and receipts", () => {
  it("lists past and cancelled rides separately, and pages through them", async () => {
    const riderId = (await setUpDemo(anon(), "rider")).id;
    const done = await completedRide(riderId);
    const cancelled = await acceptedRide("wallet", riderId);
    await cancelRideAsRider(
      riderId,
      cancelled.rideId,
      "mistake",
      later(cancelled.ride.requestedAt, 10),
    );

    const past = await listRides(riderId, "past", null);
    expect(past.items.map((i) => i.id)).toEqual([done.rideId]);
    expect(past.items[0]).toMatchObject({ status: "completed", paymentMethod: "wallet" });
    expect(past.items[0]!.sketch.length).toBeGreaterThan(1);
    const gone = await listRides(riderId, "cancelled", null);
    expect(gone.items.map((i) => i.id)).toEqual([cancelled.rideId]);
    expect((await listRides(riderId, "upcoming", null)).items).toEqual([]);
  });

  it("pages with a cursor", async () => {
    const riderId = (await setUpDemo(anon(), "rider")).id;
    // 21 cancelled rides: one full page and one more.
    for (let i = 0; i < 21; i++) {
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
      await cancelRideAsRider(riderId, rideId, null);
    }
    const first = await listRides(riderId, "cancelled", null);
    expect(first.items).toHaveLength(20);
    expect(first.nextCursor).not.toBeNull();
    const second = await listRides(riderId, "cancelled", first.nextCursor);
    expect(second.items).toHaveLength(1);
    expect(second.nextCursor).toBeNull();
    expect(new Set([...first.items, ...second.items].map((i) => i.id)).size).toBe(21);
  });

  it("shows a receipt with the rider's own rating, and only to that rider", async () => {
    const { riderId, rideId } = await completedRide();
    expect((await getRatingPrompt(riderId))?.id).toBe(rideId);
    await rateRide(riderId, rideId, { stars: 5, tags: ["Friendly"] });
    const receipt = await getReceipt(riderId, rideId);
    expect(receipt.myRating).toEqual({ stars: 5, tags: ["Friendly"] });
    expect(receipt.ride.rideCode).toBeUndefined();
    expect(await getRatingPrompt(riderId)).toBeNull();

    const stranger = (await setUpDemo(anon(), "rider")).id;
    await expect(getReceipt(stranger, rideId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
