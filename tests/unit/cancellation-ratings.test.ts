import { describe, expect, it } from "vitest";

import { CANCEL_FEE, FREE_CANCEL_S, cancellationFee } from "@/lib/cancellation";
import { starString } from "@/lib/ratings";

const booked = new Date("2026-10-11T10:00:00Z");
const after = (s: number) => new Date(booked.getTime() + s * 1000);

describe("cancellation fee", () => {
  it("is free while still searching, however long it's been", () => {
    expect(
      cancellationFee({
        status: "requested",
        requestedAt: booked,
        now: after(3_600),
        reason: null,
      }),
    ).toBe(0);
  });

  it("is free up to 3 minutes after booking, then ₹25", () => {
    const at = (s: number) =>
      cancellationFee({
        status: "accepted",
        requestedAt: booked,
        now: after(s),
        reason: "plans_changed",
      });
    expect(at(FREE_CANCEL_S)).toBe(0);
    expect(at(FREE_CANCEL_S + 1)).toBe(CANCEL_FEE);
    expect(CANCEL_FEE).toBe(2_500);
  });

  it("applies once the Pilot has arrived too", () => {
    expect(
      cancellationFee({
        status: "arrived",
        requestedAt: booked,
        now: after(600),
        reason: "mistake",
      }),
    ).toBe(CANCEL_FEE);
  });

  it("is waived when the Pilot is at fault", () => {
    for (const reason of ["pilot_asked", "wrong_way"] as const) {
      expect(
        cancellationFee({ status: "accepted", requestedAt: booked, now: after(600), reason }),
      ).toBe(0);
    }
  });
});

describe("starString", () => {
  it("draws filled and empty stars, clamped to 0–5", () => {
    expect(starString(4)).toBe("★★★★☆");
    expect(starString(5)).toBe("★★★★★");
    expect(starString(9)).toBe("★★★★★");
    expect(starString(-1)).toBe("☆☆☆☆☆");
  });
});
