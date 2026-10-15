import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import type { LatLng } from "@/lib/geo";
import { DEMO_SAFETY_PIN } from "@/lib/safety";
import { setUpDemo } from "@/lib/services/accounts";
import { acceptOffer, goOnline, listOpenOffers } from "@/lib/services/pilots";
import { quoteFare } from "@/lib/services/quotes";
import { bookRide } from "@/lib/services/rides";
import { createShareLink, getSharedTrip, hashToken } from "@/lib/services/share";
import { endSos, getOpenSos, raiseSos, setSafetyPin } from "@/lib/services/sos";
import { endTrip, markArrived, startTrip } from "@/lib/services/trips";

/** SOS, the safety PIN and shared trip links against a real database. */

const KORAMANGALA: LatLng = { lat: 12.9352, lng: 77.6245 };
const MG_ROAD: LatLng = { lat: 12.9756, lng: 77.6066 };
const anon = () => ({ id: randomUUID(), email: null, isAnonymous: true });
const later = (s: number) => new Date(Date.now() + s * 1000);

beforeAll(() => {
  process.env.COMET_FAKE_EXTERNALS = "1";
});
afterAll(async () => {
  await db.$disconnect();
});

async function acceptedRide() {
  await db.$executeRaw`UPDATE pilot_locations SET is_online = false`;
  const pilotId = (await setUpDemo(anon(), "pilot")).id;
  await goOnline(pilotId, KORAMANGALA);
  const riderId = (await setUpDemo(anon(), "rider")).id;
  const q = await quoteFare(
    riderId,
    { address: "27th Main Road, Koramangala, Bengaluru", point: KORAMANGALA },
    { address: "Church Street, MG Road, Bengaluru", point: MG_ROAD },
  );
  const { rideId } = await bookRide(riderId, {
    quoteId: q.quoteId,
    tier: "go",
    paymentMethod: "cash",
  });
  await acceptOffer(pilotId, (await listOpenOffers(pilotId))[0]!.offerId);
  const ride = await db.ride.findUniqueOrThrow({ where: { id: rideId } });
  return { pilotId, riderId, rideId, code: ride.rideCode };
}

describe("SOS", () => {
  it("raises once per ride however often it's tapped, and records where", async () => {
    const { riderId, rideId } = await acceptedRide();
    const first = await raiseSos(riderId, rideId, { point: KORAMANGALA });
    const again = await raiseSos(riderId, rideId, {});
    expect(again.id).toBe(first.id);
    expect(first).toMatchObject({ role: "rider", status: "open", reason: null });
    const row = await db.sosAlert.findUniqueOrThrow({ where: { id: first.id } });
    expect(row).toMatchObject({ lastLat: KORAMANGALA.lat, lastLng: KORAMANGALA.lng });
    expect((await getOpenSos(riderId, rideId))?.id).toBe(first.id);
  });

  it("lets the Pilot raise their own, with a reason, falling back to the car's position", async () => {
    const { pilotId, rideId } = await acceptedRide();
    const alert = await raiseSos(pilotId, rideId, { reason: "accident" });
    expect(alert).toMatchObject({ role: "pilot", reason: "accident" });
    const row = await db.sosAlert.findUniqueOrThrow({ where: { id: alert.id } });
    expect(row.lastLat).toBeCloseTo(KORAMANGALA.lat, 4);
  });

  it("refuses strangers", async () => {
    const { rideId } = await acceptedRide();
    const stranger = (await setUpDemo(anon(), "rider")).id;
    await expect(raiseSos(stranger, rideId)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("ends only with the right PIN; demo accounts use the demo PIN", async () => {
    const { riderId, rideId } = await acceptedRide();
    const alert = await raiseSos(riderId, rideId);
    await expect(endSos(riderId, alert.id, "0000")).rejects.toMatchObject({ code: "INVALID_CODE" });
    expect((await getOpenSos(riderId, rideId))?.status).toBe("open");
    await endSos(riderId, alert.id, DEMO_SAFETY_PIN);
    expect(await getOpenSos(riderId, rideId)).toBeNull();
    const row = await db.sosAlert.findUniqueOrThrow({ where: { id: alert.id } });
    expect(row.status).toBe("resolved");
    expect(row.resolvedAt).not.toBeNull();
  });

  it("can't be ended by someone else, even with the right PIN", async () => {
    const { riderId, pilotId, rideId } = await acceptedRide();
    const alert = await raiseSos(riderId, rideId);
    await expect(endSos(pilotId, alert.id, DEMO_SAFETY_PIN)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("stores only a hash of the PIN, and needs the current PIN to change it", async () => {
    const { riderId } = await acceptedRide();
    const before = await db.user.findUniqueOrThrow({ where: { id: riderId } });
    expect(before.safetyPinHash).toMatch(/^\$argon2id\$/);
    expect(before.safetyPinHash).not.toContain(DEMO_SAFETY_PIN);
    await expect(setSafetyPin(riderId, "4321", "9999")).rejects.toMatchObject({
      code: "INVALID_CODE",
    });
    await setSafetyPin(riderId, "4321", DEMO_SAFETY_PIN);
    await expect(setSafetyPin(riderId, "12a4", "4321")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("lets someone with no PIN yet end it by choosing one", async () => {
    const { riderId, rideId } = await acceptedRide();
    await db.user.update({ where: { id: riderId }, data: { safetyPinHash: null } });
    const alert = await raiseSos(riderId, rideId);
    await endSos(riderId, alert.id, "2468");
    const user = await db.user.findUniqueOrThrow({ where: { id: riderId } });
    expect(user.safetyPinHash).toMatch(/^\$argon2id\$/);
  });
});

describe("shared trip links", () => {
  it("shows the live trip without anything private, and stores only the token's hash", async () => {
    const { riderId, pilotId, rideId, code } = await acceptedRide();
    const { path } = await createShareLink(riderId, rideId);
    const token = path.replace("/t/", "");
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const row = await db.shareLink.findFirstOrThrow({ where: { rideId } });
    expect(row.tokenHash).toBe(hashToken(token));
    expect(row.tokenHash).not.toContain(token);

    await markArrived(pilotId, rideId);
    await startTrip(pilotId, rideId, code);
    const trip = await getSharedTrip(token);
    expect(trip).toMatchObject({
      state: "live",
      riderFirstName: "Aarav",
      status: "in_progress",
      pilot: { name: "Rohan K.", plate: "KA 05 MX 2841" },
      dropArea: { name: "MG Road" },
      pickupArea: "Koramangala",
    });
    const text = JSON.stringify(trip);
    for (const secret of [code, "Church Street", "27th Main Road", "paymentMethod", "cometId"]) {
      expect(text).not.toContain(secret);
    }
    if (trip.state === "live") {
      expect(trip.dropArea.point.lat).toBe(Math.round(MG_ROAD.lat * 100) / 100);
      expect(trip.etaAt).not.toBeNull();
    }
  });

  it("works for an hour after the trip ends, then stops", async () => {
    const { riderId, pilotId, rideId, code } = await acceptedRide();
    const token = (await createShareLink(riderId, rideId)).path.replace("/t/", "");
    await markArrived(pilotId, rideId);
    await startTrip(pilotId, rideId, code);
    await endTrip(pilotId, rideId);
    expect((await getSharedTrip(token, later(30 * 60))).state).toBe("live");
    expect((await getSharedTrip(token, later(61 * 60))).state).toBe("ended");
  });

  it("rejects unknown, malformed, revoked and expired tokens", async () => {
    const { riderId, rideId } = await acceptedRide();
    const token = (await createShareLink(riderId, rideId)).path.replace("/t/", "");
    expect((await getSharedTrip("not-a-token")).state).toBe("invalid");
    expect((await getSharedTrip("A".repeat(43))).state).toBe("invalid");
    expect((await getSharedTrip(token, later(13 * 60 * 60))).state).toBe("invalid");
    await db.shareLink.updateMany({ where: { rideId }, data: { revokedAt: new Date() } });
    expect((await getSharedTrip(token)).state).toBe("invalid");
  });

  it("only the rider can share, and only while the trip is on", async () => {
    const { riderId, pilotId, rideId } = await acceptedRide();
    await expect(createShareLink(pilotId, rideId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    const stranger = (await setUpDemo(anon(), "rider")).id;
    await expect(createShareLink(stranger, rideId)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await db.$executeRaw`UPDATE rides SET status = 'cancelled', cancelled_at = now() WHERE id = ${rideId}::uuid`;
    await expect(createShareLink(riderId, rideId)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
