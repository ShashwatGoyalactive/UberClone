import { describe, expect, it } from "vitest";

import {
  MAX_SURGE,
  TIER_RATES,
  clampSurge,
  quoteAllTiers,
  quoteTier,
  splitFare,
} from "@/lib/fares";

const TRIP = { distanceM: 7_400, durationS: 18 * 60 }; // HSR → Indiranagar, roughly

describe("quoteTier", () => {
  it("adds base, distance and time, rounded to the rupee", () => {
    const go = quoteTier("go", TRIP);
    // ₹50 + 7.4 km × ₹12 (₹88.80) + 18 min × ₹2 (₹36) = ₹174.80 → ₹175
    expect(go.base).toBe(5_000);
    expect(go.distance).toBe(8_880);
    expect(go.time).toBe(3_600);
    expect(go.total).toBe(17_500);
    expect(go.total % 100).toBe(0);
  });

  it("orders tiers from cheapest to most expensive for a normal trip", () => {
    const q = quoteAllTiers(TRIP);
    expect(q.bike.total).toBeLessThan(q.auto.total);
    expect(q.auto.total).toBeLessThan(q.go.total);
    expect(q.go.total).toBeLessThan(q.prime.total);
  });

  it("never charges less than the tier minimum", () => {
    const tiny = quoteTier("go", { distanceM: 300, durationS: 60 });
    expect(tiny.subtotal).toBeLessThan(TIER_RATES.go.minimum);
    expect(tiny.total).toBe(TIER_RATES.go.minimum);
  });

  it("applies surge to the whole fare", () => {
    const normal = quoteTier("go", TRIP);
    const surged = quoteTier("go", { ...TRIP, surge: 1.4 });
    expect(surged.surge).toBe(1.4);
    expect(surged.total).toBe(
      Math.round(((normal.base + normal.distance + normal.time) * 1.4) / 100) * 100,
    );
  });

  it("rejects negative inputs", () => {
    expect(() => quoteTier("bike", { distanceM: -1, durationS: 0 })).toThrow(RangeError);
  });

  it("always returns integer paise", () => {
    for (let km = 0; km < 40; km += 0.37) {
      const q = quoteAllTiers({ distanceM: km * 1000, durationS: km * 150 });
      for (const fare of Object.values(q)) expect(Number.isInteger(fare.total)).toBe(true);
    }
  });
});

describe("clampSurge", () => {
  it("keeps surge within 1× and the maximum", () => {
    expect(clampSurge(undefined)).toBe(1);
    expect(clampSurge(0.5)).toBe(1);
    expect(clampSurge(1.37)).toBe(1.37);
    expect(clampSurge(9)).toBe(MAX_SURGE);
    expect(clampSurge(Number.NaN)).toBe(1);
  });
});

describe("splitFare", () => {
  it("takes 15% for the platform and gives the rest plus tips to the Pilot", () => {
    expect(splitFare(17_500)).toEqual({ platformFee: 2_625, pilotEarning: 14_875 });
    expect(splitFare(17_500, 2_000)).toEqual({ platformFee: 2_625, pilotEarning: 16_875 });
  });

  it("rounds the fee down so rounding favours the Pilot", () => {
    const { platformFee, pilotEarning } = splitFare(10_001);
    expect(platformFee).toBe(1_500);
    expect(platformFee + pilotEarning).toBe(10_001);
  });
});
