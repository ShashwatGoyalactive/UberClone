import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { TRANSITIONS } from "@/lib/ride-state";
import type { LatLng } from "@/lib/geo";
import { setUpDemo } from "@/lib/services/accounts";
import { OFFER_TTL_MS, REQUEST_TIMEOUT_MS } from "@/lib/services/matching";
import {
  acceptOffer,
  declineOffer,
  getPilotActiveRide,
  goOnline,
  listOpenOffers,
} from "@/lib/services/pilots";
import { quoteFare } from "@/lib/services/quotes";
import { bookRide, cancelRideAsRider, getRiderActiveRide } from "@/lib/services/rides";

/**
 * Booking and matching against real Postgres + PostGIS: who gets offered a
 * ride, first-accept-wins under a real race, waves, expiry, and the
 * database guarantees (state machine, one active ride, append-only log).
 */

const HSR: LatLng = { lat: 12.9116, lng: 77.6474 };
const INDIRANAGAR: LatLng = { lat: 12.9784, lng: 77.6408 };
/** Offset a point north by roughly `m` metres. */
const north = (p: LatLng, m: number): LatLng => ({ lat: p.lat + m / 111_320, lng: p.lng });

const anon = () => ({ id: randomUUID(), email: null, isAnonymous: true });

async function newRider() {
  return (await setUpDemo(anon(), "rider")).id;
}
async function newPilot(at: LatLng) {
  const id = (await setUpDemo(anon(), "pilot")).id;
  await goOnline(id, at);
  return id;
}
async function book(riderId: string, now = new Date()) {
  const q = await quoteFare(
    riderId,
    { address: "HSR", point: HSR },
    { address: "Indiranagar", point: INDIRANAGAR },
    now,
  );
  return bookRide(riderId, { quoteId: q.quoteId, tier: "go", paymentMethod: "cash" }, now);
}

beforeAll(async () => {
  process.env.COMET_FAKE_EXTERNALS = "1";
});

afterAll(async () => {
  await db.$disconnect();
});

// Pilots from one test must not be offered rides in the next, so every
// test parks all online Pilots first and places its own.
async function clearTheRoads() {
  await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
}

describe("matching", () => {
  it("offers a new ride to the nearest Pilots first, at most three", async () => {
    await clearTheRoads();
    const near = await newPilot(north(HSR, 200));
    const mid = await newPilot(north(HSR, 800));
    const far = await newPilot(north(HSR, 2_000));
    const farther = await newPilot(north(HSR, 3_000));
    const { rideId } = await book(await newRider());

    const offers = await db.rideOffer.findMany({ where: { rideId } });
    expect(offers.map((o) => o.pilotId).sort()).toEqual([near, mid, far].sort());
    expect(offers.some((o) => o.pilotId === farther)).toBe(false);
  });

  it("skips Pilots who are too far, offline, stale, or on another tier", async () => {
    await clearTheRoads();
    const tooFar = await newPilot(north(HSR, 6_000));
    const offline = await newPilot(north(HSR, 300));
    await db.$executeRaw`UPDATE pilot_locations SET is_online = false WHERE pilot_id = ${offline}::uuid`;
    const stale = await newPilot(north(HSR, 300));
    await db.$executeRaw`UPDATE pilot_locations SET updated_at = now() - interval '5 minutes' WHERE pilot_id = ${stale}::uuid`;
    const prime = await newPilot(north(HSR, 300));
    await db.pilotProfile.update({ where: { userId: prime }, data: { tier: "prime" } });

    const { rideId } = await book(await newRider());
    expect(await db.rideOffer.count({ where: { rideId } })).toBe(0);
    for (const id of [tooFar, offline, stale, prime]) {
      expect(await listOpenOffers(id)).toEqual([]);
    }
  });

  it("sends the next wave when the first expires, without repeating Pilots", async () => {
    await clearTheRoads();
    const t0 = new Date();
    const first = await Promise.all([200, 300, 400].map((m) => newPilot(north(HSR, m))));
    const second = await newPilot(north(HSR, 900));
    const riderId = await newRider();
    const { rideId } = await book(riderId, t0);

    // After the offers expire, the rider's next poll advances the ride.
    await getRiderActiveRide(riderId, new Date(t0.getTime() + OFFER_TTL_MS + 1_000));
    const offers = await db.rideOffer.findMany({ where: { rideId }, orderBy: { wave: "asc" } });
    expect(
      offers
        .filter((o) => o.wave === 1)
        .map((o) => o.pilotId)
        .sort(),
    ).toEqual(first.sort());
    expect(offers.filter((o) => o.wave === 2).map((o) => o.pilotId)).toEqual([second]);
  });

  it("expires the ride after the timeout and tells the rider", async () => {
    await clearTheRoads();
    const t0 = new Date();
    const riderId = await newRider();
    const { rideId } = await book(riderId, t0);
    const view = await getRiderActiveRide(riderId, new Date(t0.getTime() + REQUEST_TIMEOUT_MS + 1));
    expect(view).toBeNull();
    expect((await db.ride.findUniqueOrThrow({ where: { id: rideId } })).status).toBe("expired");
  });
});

describe("accepting", () => {
  it("first accept wins when two Pilots accept at the same moment", async () => {
    await clearTheRoads();
    const a = await newPilot(north(HSR, 200));
    const b = await newPilot(north(HSR, 300));
    const { rideId } = await book(await newRider());
    const [offerA, offerB] = await Promise.all([listOpenOffers(a), listOpenOffers(b)]);

    const results = await Promise.allSettled([
      acceptOffer(a, offerA[0]!.offerId),
      acceptOffer(b, offerB[0]!.offerId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const loser = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(loser.reason).toMatchObject({ code: "CONFLICT" });

    const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
    expect(ride.status).toBe("accepted");
    expect([a, b]).toContain(ride.pilotId);
    const statuses = (await db.rideOffer.findMany({ where: { rideId } }))
      .map((o) => o.status)
      .sort();
    expect(statuses).toEqual(["accepted", "taken"]);
  });

  it("an accepted Pilot gets no more offers until the ride ends", async () => {
    await clearTheRoads();
    const pilot = await newPilot(north(HSR, 200));
    const r1 = await book(await newRider());
    await acceptOffer(pilot, (await listOpenOffers(pilot))[0]!.offerId);
    const r2 = await book(await newRider());
    expect(await db.rideOffer.count({ where: { rideId: r2.rideId, pilotId: pilot } })).toBe(0);
    expect((await getPilotActiveRide(pilot))?.id).toBe(r1.rideId);
  });

  it("the Pilot's view never includes the rider's ride code; the rider's does", async () => {
    await clearTheRoads();
    const pilot = await newPilot(north(HSR, 200));
    const riderId = await newRider();
    await book(riderId);
    await acceptOffer(pilot, (await listOpenOffers(pilot))[0]!.offerId);
    expect((await getPilotActiveRide(pilot))?.rideCode).toBeUndefined();
    const riderView = await getRiderActiveRide(riderId);
    expect(riderView?.rideCode).toMatch(/^\d{4}$/);
    expect(riderView?.pilot?.plate).toBe("KA 05 MX 2841");
  });

  it("a declined offer stays declined and can't then be accepted", async () => {
    await clearTheRoads();
    const pilot = await newPilot(north(HSR, 200));
    await book(await newRider());
    const [offer] = await listOpenOffers(pilot);
    await declineOffer(pilot, offer!.offerId);
    await expect(acceptOffer(pilot, offer!.offerId)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("a Pilot can't accept someone else's offer", async () => {
    await clearTheRoads();
    const pilot = await newPilot(north(HSR, 200));
    const stranger = (await setUpDemo(anon(), "pilot")).id;
    await book(await newRider());
    const [offer] = await listOpenOffers(pilot);
    await expect(acceptOffer(stranger, offer!.offerId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("rider rules", () => {
  it("a rider can't have two active rides, even with two taps at once", async () => {
    await clearTheRoads();
    const riderId = await newRider();
    const results = await Promise.allSettled([book(riderId), book(riderId)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await db.ride.count({ where: { riderId, status: "requested" } })).toBe(1);
  });

  it("cancelling frees the Pilot and closes open offers", async () => {
    await clearTheRoads();
    const pilot = await newPilot(north(HSR, 200));
    const riderId = await newRider();
    const { rideId } = await book(riderId);
    await acceptOffer(pilot, (await listOpenOffers(pilot))[0]!.offerId);
    await cancelRideAsRider(riderId, rideId, "plans_changed");
    expect((await db.ride.findUniqueOrThrow({ where: { id: rideId } })).status).toBe("cancelled");
    expect(await getPilotActiveRide(pilot)).toBeNull();
  });

  it("another rider can't cancel your ride", async () => {
    await clearTheRoads();
    const { rideId } = await book(await newRider());
    await expect(cancelRideAsRider(await newRider(), rideId, null)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});

describe("database guarantees", () => {
  it("the trigger allows exactly the transitions lib/ride-state.ts allows", async () => {
    const [{ src }] = await db.$queryRaw<{ src: string }[]>`
      SELECT prosrc AS src FROM pg_proc WHERE proname = 'enforce_ride_transition'
    `;
    const inDb = [...src.matchAll(/\('(\w+)',\s*'(\w+)'\)/g)].map((m) => `${m[1]}->${m[2]}`).sort();
    const inCode = Object.entries(TRANSITIONS)
      .flatMap(([from, tos]) => tos.map((to) => `${from}->${to}`))
      .sort();
    expect(inDb).toEqual(inCode);
  });

  it("rejects an illegal state transition even from raw SQL", async () => {
    await clearTheRoads();
    const { rideId } = await book(await newRider());
    await expect(
      db.$executeRaw`UPDATE rides SET status = 'completed' WHERE id = ${rideId}::uuid`,
    ).rejects.toThrow(/Illegal ride transition/);
  });

  it("keeps ride_events append-only", async () => {
    await clearTheRoads();
    const { rideId } = await book(await newRider());
    await expect(
      db.$executeRaw`UPDATE ride_events SET type = 'tampered' WHERE ride_id = ${rideId}::uuid`,
    ).rejects.toThrow(/append-only/);
    await expect(
      db.$executeRaw`DELETE FROM ride_events WHERE ride_id = ${rideId}::uuid`,
    ).rejects.toThrow(/append-only/);
  });

  it("records each state change in the event log", async () => {
    await clearTheRoads();
    const pilot = await newPilot(north(HSR, 200));
    const { rideId } = await book(await newRider());
    await acceptOffer(pilot, (await listOpenOffers(pilot))[0]!.offerId);
    const types = (
      await db.rideEvent.findMany({ where: { rideId }, orderBy: { createdAt: "asc" } })
    ).map((e) => e.type);
    expect(types).toEqual(["ride.requested", "offers.sent", "ride.accepted"]);
  });
});
