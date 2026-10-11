import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { SIM, SIM_TOTAL_S } from "@/lib/demo-sim";
import type { LatLng } from "@/lib/geo";
import { setUpDemo } from "@/lib/services/accounts";
import { tickDemoRide } from "@/lib/services/demo-sim";
import { acceptOffer, goOnline, listOpenOffers } from "@/lib/services/pilots";
import { quoteFare } from "@/lib/services/quotes";
import { bookRide } from "@/lib/services/rides";
import { cancelAsNoShow, endTrip, markArrived, startTrip } from "@/lib/services/trips";
import { FREE_WAIT_S, NO_SHOW_AFTER_S, NO_SHOW_FEE } from "@/lib/trip-fees";

/** The live trip against a real database: real Pilots, then the demo bot. */

const KORAMANGALA: LatLng = { lat: 12.9352, lng: 77.6245 };
const MG_ROAD: LatLng = { lat: 12.9756, lng: 77.6066 };
const anon = () => ({ id: randomUUID(), email: null, isAnonymous: true });
const at = (base: Date, s: number) => new Date(base.getTime() + s * 1000);

beforeAll(() => {
  process.env.COMET_FAKE_EXTERNALS = "1";
});
afterAll(async () => {
  await db.$disconnect();
});

async function bookFor(riderId: string, now = new Date()) {
  const q = await quoteFare(
    riderId,
    { address: "Koramangala", point: KORAMANGALA },
    { address: "MG Road", point: MG_ROAD },
    now,
  );
  return (await bookRide(riderId, { quoteId: q.quoteId, tier: "go", paymentMethod: "cash" }, now))
    .rideId;
}

/** A rider and a real Pilot with an accepted ride. */
async function acceptedRide() {
  await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
  const pilotId = (await setUpDemo(anon(), "pilot")).id;
  await goOnline(pilotId, KORAMANGALA);
  const riderId = (await setUpDemo(anon(), "rider")).id;
  const rideId = await bookFor(riderId);
  await acceptOffer(pilotId, (await listOpenOffers(pilotId))[0]!.offerId);
  const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
  return { pilotId, riderId, rideId, code: ride.rideCode };
}

describe("a real Pilot's trip", () => {
  it("arrives, starts with the rider's code, and ends", async () => {
    const { pilotId, rideId, code } = await acceptedRide();
    const t0 = new Date();
    await markArrived(pilotId, rideId, t0);
    await startTrip(pilotId, rideId, code, at(t0, 60));
    await endTrip(pilotId, rideId, at(t0, 600));
    const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    expect(ride.status).toBe("completed");
    expect(ride.waitingFeePaise).toBe(0);
    expect(ride.totalPaise).toBe(ride.farePaise);
    // The Pilot is free for the next ride.
    const loc = await db.$queryRaw<{ is_available: boolean }[]>`
      SELECT is_available FROM pilot_locations WHERE pilot_id = ${pilotId}::uuid`;
    expect(loc[0]!.is_available).toBe(true);
  });

  it("adds a waiting fee after the free three minutes", async () => {
    const { pilotId, rideId, code } = await acceptedRide();
    const t0 = new Date();
    await markArrived(pilotId, rideId, t0);
    await startTrip(pilotId, rideId, code, at(t0, FREE_WAIT_S + 90)); // 2 started minutes
    const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    expect(ride.waitingFeePaise).toBe(400);
    expect(ride.totalPaise).toBe(ride.farePaise + 400);
  });

  it("rejects wrong codes, counts them, and locks after five", async () => {
    const { pilotId, rideId, code } = await acceptedRide();
    await markArrived(pilotId, rideId);
    const wrong = code === "0000" ? "1111" : "0000";
    for (let i = 4; i >= 1; i--) {
      await expect(startTrip(pilotId, rideId, wrong)).rejects.toMatchObject({
        code: "INVALID_CODE",
        message: expect.stringContaining(`${i} ${i === 1 ? "try" : "tries"} left`),
      });
    }
    await expect(startTrip(pilotId, rideId, wrong)).rejects.toMatchObject({ code: "FORBIDDEN" });
    // Even the right code is refused now.
    await expect(startTrip(pilotId, rideId, code)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("won't skip steps: no start before arriving, no end before starting", async () => {
    const { pilotId, rideId, code } = await acceptedRide();
    await expect(startTrip(pilotId, rideId, code)).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(endTrip(pilotId, rideId)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("only the assigned Pilot can act on the ride", async () => {
    const { rideId } = await acceptedRide();
    const stranger = (await setUpDemo(anon(), "pilot")).id;
    await expect(markArrived(stranger, rideId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows a no-show cancel only after five minutes, charging ₹40", async () => {
    const { pilotId, rideId } = await acceptedRide();
    const t0 = new Date();
    await markArrived(pilotId, rideId, t0);
    await expect(
      cancelAsNoShow(pilotId, rideId, at(t0, NO_SHOW_AFTER_S - 5)),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await cancelAsNoShow(pilotId, rideId, at(t0, NO_SHOW_AFTER_S));
    const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    expect(ride.status).toBe("no_show");
    expect(ride.cancellationFeePaise).toBe(NO_SHOW_FEE);
  });
});

describe("the demo's simulated Pilot", () => {
  async function demoRide() {
    await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
    const riderId = (await setUpDemo(anon(), "rider")).id;
    const t0 = new Date();
    const rideId = await bookFor(riderId, t0);
    return { riderId, rideId, t0 };
  }

  it("each demo rider has a private bot Pilot nobody can sign in as", async () => {
    const riderId = (await setUpDemo(anon(), "rider")).id;
    const bot = await db.pilotProfile.findFirstOrThrow({ where: { simulatedForUserId: riderId } });
    expect(bot.isSimulated).toBe(true);
    expect(bot.status).toBe("approved");
  });

  it("waits, accepts, arrives, drives and completes on schedule", async () => {
    const { riderId, rideId, t0 } = await demoRide();
    const status = async (s: number) => (await tickDemoRide(riderId, rideId, at(t0, s))).status;

    expect(await status(1)).toBe("requested");
    expect(await status(SIM.ACCEPT_AT_S + 1)).toBe("accepted");
    expect(await status(SIM.ACCEPT_AT_S + SIM.APPROACH_S + 1)).toBe("arrived");
    expect(await status(SIM.ACCEPT_AT_S + SIM.APPROACH_S + SIM.WAIT_S + 1)).toBe("in_progress");
    const done = await tickDemoRide(riderId, rideId, at(t0, SIM_TOTAL_S + 1));
    expect(done.status).toBe("completed");
    expect(done.waitingFeePaise).toBe(0);
  });

  it("catches up in one tick if the tab was closed for the whole ride", async () => {
    const { riderId, rideId, t0 } = await demoRide();
    const view = await tickDemoRide(riderId, rideId, at(t0, SIM_TOTAL_S + 30));
    expect(view.status).toBe("completed");
    const types = (
      await db.rideEvent.findMany({ where: { rideId }, orderBy: { createdAt: "asc" } })
    ).map((e) => e.type);
    expect(types).toEqual(
      expect.arrayContaining(["ride.accepted", "ride.arrived", "ride.started", "ride.completed"]),
    );
  });

  it("moves the car toward the pickup during the approach", async () => {
    const { riderId, rideId, t0 } = await demoRide();
    const early = await tickDemoRide(riderId, rideId, at(t0, SIM.ACCEPT_AT_S + 2));
    const later = await tickDemoRide(riderId, rideId, at(t0, SIM.ACCEPT_AT_S + SIM.APPROACH_S - 2));
    const dist = (p: LatLng) => Math.hypot(p.lat - KORAMANGALA.lat, p.lng - KORAMANGALA.lng);
    expect(dist(later.pilot!.point!)).toBeLessThan(dist(early.pilot!.point!));
  });

  it("steps aside when a real Pilot accepts first", async () => {
    await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
    const real = (await setUpDemo(anon(), "pilot")).id;
    await goOnline(real, KORAMANGALA);
    const riderId = (await setUpDemo(anon(), "rider")).id;
    const t0 = new Date();
    const rideId = await bookFor(riderId, t0);
    await acceptOffer(real, (await listOpenOffers(real))[0]!.offerId);
    const view = await tickDemoRide(riderId, rideId, at(t0, SIM_TOTAL_S + 1));
    expect(view.status).toBe("accepted"); // the real Pilot drives at their own pace
    expect((await db.ride.findUniqueOrThrow({ where: { id: rideId } })).pilotId).toBe(real);
  });

  it("refuses to tick someone else's ride", async () => {
    const { rideId } = await demoRide();
    const other = (await setUpDemo(anon(), "rider")).id;
    await expect(tickDemoRide(other, rideId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("the Simulated Pilot switch", () => {
  it("keeps the bot out when the rider switched it off", async () => {
    await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
    const riderId = (await setUpDemo(anon(), "rider", undefined, { simulatedPilot: false })).id;
    const rideId = await bookFor(riderId);
    const { requestedAt } = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    const view = await tickDemoRide(riderId, rideId, at(requestedAt, SIM.ACCEPT_AT_S + 5));
    expect(view.status).toBe("requested");
    expect(view.pilot).toBeUndefined();
  });
});
