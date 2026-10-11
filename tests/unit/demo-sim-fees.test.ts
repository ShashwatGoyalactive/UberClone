import { describe, expect, it } from "vitest";

import { SIM, SIM_TOTAL_S, simPosition, simStartPoint, simStep } from "@/lib/demo-sim";
import { haversineM } from "@/lib/geo";
import { FREE_WAIT_S, NO_SHOW_AFTER_S, canCancelAsNoShow, waitingFee } from "@/lib/trip-fees";

const PICKUP = { lat: 12.9116, lng: 77.6474 };
const ROUTE: [number, number][] = [
  [77.6474, 12.9116],
  [77.6408, 12.9116],
  [77.6408, 12.9784],
];

describe("simulated Pilot script", () => {
  it("runs searching → approaching → waiting → on trip → done, in order", () => {
    const phases = Array.from({ length: SIM_TOTAL_S + 5 }, (_, s) => simStep(s).phase);
    const order = phases.filter((p, i) => i === 0 || p !== phases[i - 1]);
    expect(order).toEqual(["searching", "approaching", "waiting", "on_trip", "done"]);
  });

  it("finishes a whole ride in under two minutes", () => {
    expect(SIM_TOTAL_S).toBeLessThan(120);
    expect(simStep(SIM_TOTAL_S).phase).toBe("done");
  });

  it("starts about 1.2 km from the pickup and ends the approach on it", () => {
    expect(haversineM(simStartPoint(PICKUP), PICKUP)).toBeCloseTo(SIM.START_DISTANCE_M, -2);
    const arrived = simPosition({ phase: "waiting", progress: 0 }, PICKUP, ROUTE);
    expect(haversineM(arrived.point, PICKUP)).toBeLessThan(1);
  });

  it("moves steadily closer during the approach", () => {
    const at = (p: number) =>
      haversineM(simPosition({ phase: "approaching", progress: p }, PICKUP, ROUTE).point, PICKUP);
    expect(at(0.25)).toBeGreaterThan(at(0.5));
    expect(at(0.5)).toBeGreaterThan(at(0.75));
  });

  it("drives the real route and ends at the drop", () => {
    const done = simPosition({ phase: "done", progress: 1 }, PICKUP, ROUTE).point;
    expect(done).toEqual({ lat: 12.9784, lng: 77.6408 });
  });

  it("is a pure function of time: the same moment gives the same answer", () => {
    expect(simStep(40.5)).toEqual(simStep(40.5));
  });
});

describe("waiting fee", () => {
  const arrived = new Date("2026-10-11T10:00:00Z");
  const after = (s: number) => new Date(arrived.getTime() + s * 1000);

  it("is free for the first three minutes", () => {
    expect(waitingFee(arrived, after(FREE_WAIT_S))).toBe(0);
  });

  it("charges ₹2 for each started minute after that", () => {
    expect(waitingFee(arrived, after(FREE_WAIT_S + 1))).toBe(200);
    expect(waitingFee(arrived, after(FREE_WAIT_S + 60))).toBe(200);
    expect(waitingFee(arrived, after(FREE_WAIT_S + 61))).toBe(400);
  });

  it("unlocks a no-show cancel only after five minutes", () => {
    expect(canCancelAsNoShow(arrived, after(NO_SHOW_AFTER_S - 1))).toBe(false);
    expect(canCancelAsNoShow(arrived, after(NO_SHOW_AFTER_S))).toBe(true);
  });
});
