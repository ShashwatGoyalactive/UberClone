import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { setUpDemo } from "@/lib/services/accounts";
import { getValidQuote, QUOTE_TTL_MS, quoteFare } from "@/lib/services/quotes";

/**
 * Quotes against a real database, with the fake maps provider
 * (COMET_FAKE_EXTERNALS is forced on below).
 */

const HSR = { address: "27th Main Road, HSR Layout", point: { lat: 12.9116, lng: 77.6474 } };
const INDIRANAGAR = { address: "Indiranagar Metro", point: { lat: 12.9784, lng: 77.6408 } };

let riderId: string;
let otherRiderId: string;

beforeAll(async () => {
  process.env.COMET_FAKE_EXTERNALS = "1";
  riderId = (await setUpDemo({ id: randomUUID(), email: null, isAnonymous: true }, "rider")).id;
  otherRiderId = (await setUpDemo({ id: randomUUID(), email: null, isAnonymous: true }, "rider"))
    .id;
});

afterAll(async () => {
  await db.$disconnect();
});

describe("quoteFare", () => {
  it("prices all four tiers from the routed distance and stores the quote", async () => {
    const q = await quoteFare(riderId, HSR, INDIRANAGAR);
    expect(q.distanceM).toBeGreaterThan(7_000);
    expect(Object.keys(q.prices).sort()).toEqual(["auto", "bike", "go", "prime"]);
    expect(q.prices.bike).toBeLessThan(q.prices.prime);
    expect(q.routeCoordinates.length).toBeGreaterThanOrEqual(2);
    const row = await db.fareQuote.findUniqueOrThrow({ where: { id: q.quoteId } });
    expect(row.riderId).toBe(riderId);
  });

  it("locks the quote for five minutes", async () => {
    const now = new Date("2026-10-11T10:00:00Z");
    const q = await quoteFare(riderId, HSR, INDIRANAGAR, now);
    expect(new Date(q.expiresAt).getTime() - now.getTime()).toBe(QUOTE_TTL_MS);
  });

  it("refuses a trip whose pickup and drop are the same place", async () => {
    await expect(quoteFare(riderId, HSR, HSR)).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("the database rejects coordinates outside India even if code didn't", async () => {
    await expect(
      db.fareQuote.create({
        data: {
          riderId,
          pickupAddress: "London",
          pickupLat: 51.5,
          pickupLng: -0.12,
          dropAddress: "HSR",
          dropLat: 12.91,
          dropLng: 77.64,
          distanceM: 1,
          durationS: 1,
          routeCoordinates: [],
          prices: {},
          expiresAt: new Date(),
        },
      }),
    ).rejects.toThrow();
  });
});

describe("getValidQuote", () => {
  it("returns a fresh quote to its own rider", async () => {
    const q = await quoteFare(riderId, HSR, INDIRANAGAR);
    const found = await getValidQuote(riderId, q.quoteId);
    expect(found.id).toBe(q.quoteId);
  });

  it("hides another rider's quote as not found", async () => {
    const q = await quoteFare(riderId, HSR, INDIRANAGAR);
    await expect(getValidQuote(otherRiderId, q.quoteId)).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects an expired quote so the client re-quotes", async () => {
    const q = await quoteFare(riderId, HSR, INDIRANAGAR, new Date("2026-10-11T10:00:00Z"));
    await expect(
      getValidQuote(riderId, q.quoteId, new Date("2026-10-11T10:05:01Z")),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
