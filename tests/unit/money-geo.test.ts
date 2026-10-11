import { describe, expect, it } from "vitest";

import {
  bearingDeg,
  estimateRoad,
  haversineM,
  isInIndia,
  lineLengthM,
  pointAlong,
} from "@/lib/geo";
import { createFakeMaps } from "@/lib/mapbox/fake";
import { formatRupees, formatRupeesExact, roundToRupee, rupees } from "@/lib/money";

const HSR = { lat: 12.9116, lng: 77.6474 };
const INDIRANAGAR = { lat: 12.9784, lng: 77.6408 };

describe("money", () => {
  it("formats with Indian digit grouping", () => {
    expect(formatRupees(124_000)).toBe("₹1,240");
    expect(formatRupees(12_345_600)).toBe("₹1,23,456");
    expect(formatRupeesExact(124_050)).toBe("₹1,240.50");
  });

  it("shows negatives with a real minus sign", () => {
    expect(formatRupees(-14_800)).toBe("−₹148");
  });

  it("refuses non-integer paise", () => {
    expect(() => formatRupees(1.5)).toThrow(TypeError);
  });

  it("converts and rounds", () => {
    expect(rupees(1.5)).toBe(150);
    expect(roundToRupee(17_480)).toBe(17_500);
    expect(roundToRupee(17_449)).toBe(17_400);
  });
});

describe("geo", () => {
  it("measures HSR to Indiranagar at about 7.5 km in a straight line", () => {
    const m = haversineM(HSR, INDIRANAGAR);
    expect(m).toBeGreaterThan(7_300);
    expect(m).toBeLessThan(7_600);
  });

  it("estimates road distance with a detour factor and city speed", () => {
    const { distanceM, durationS } = estimateRoad(HSR, INDIRANAGAR);
    expect(distanceM).toBeGreaterThan(haversineM(HSR, INDIRANAGAR));
    expect(durationS).toBeGreaterThan(20 * 60);
  });

  it("knows India's bounding box", () => {
    expect(isInIndia(HSR)).toBe(true);
    expect(isInIndia({ lat: 51.5, lng: -0.12 })).toBe(false);
  });

  it("walks along a line and clamps at the ends", () => {
    const line = [HSR, { lat: HSR.lat, lng: INDIRANAGAR.lng }, INDIRANAGAR];
    const total = lineLengthM(line);
    expect(pointAlong(line, -5).point).toEqual(HSR);
    expect(pointAlong(line, total + 100).point).toEqual(INDIRANAGAR);
    const mid = pointAlong(line, total / 2).point;
    expect(haversineM(HSR, mid)).toBeGreaterThan(0);
    expect(haversineM(mid, INDIRANAGAR)).toBeGreaterThan(0);
  });

  it("computes compass bearings", () => {
    expect(Math.round(bearingDeg(HSR, { lat: HSR.lat + 0.1, lng: HSR.lng }))).toBe(0);
    expect(Math.round(bearingDeg(HSR, { lat: HSR.lat, lng: HSR.lng + 0.1 }))).toBe(90);
  });
});

describe("fake maps provider", () => {
  const maps = createFakeMaps();

  it("routes deterministically with a real length", async () => {
    const a = await maps.route(HSR, INDIRANAGAR);
    const b = await maps.route(HSR, INDIRANAGAR);
    expect(a).toEqual(b);
    expect(a!.coordinates).toHaveLength(3);
    expect(a!.distanceM).toBeGreaterThan(7_000);
  });

  it("returns no route when pickup and drop are the same place", async () => {
    expect(await maps.route(HSR, HSR)).toBeNull();
  });

  it("searches after three characters, nearest first", async () => {
    expect(await maps.searchPlaces("ai")).toEqual([]);
    const results = await maps.searchPlaces("airport", HSR);
    expect(results.length).toBe(2);
    expect(results[0]!.name).toContain("Airport");
  });
});
