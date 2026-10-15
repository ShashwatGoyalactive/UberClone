import { describe, expect, it } from "vitest";

import { isNightInIndia, modeActive } from "@/lib/women-only";

/** India is UTC+5:30, so 9 pm IST is 15:30 UTC and 6 am IST is 00:30 UTC. */
const ist = (hhmmUtc: string) => new Date(`2026-10-16T${hhmmUtc}:00Z`);

describe("night in India", () => {
  it("runs from 9 pm to 6 am, India time", () => {
    expect(isNightInIndia(ist("15:29"))).toBe(false); // 8:59 pm
    expect(isNightInIndia(ist("15:30"))).toBe(true); // 9:00 pm
    expect(isNightInIndia(ist("00:29"))).toBe(true); // 5:59 am
    expect(isNightInIndia(ist("00:30"))).toBe(false); // 6:00 am
  });

  it("applies modes", () => {
    expect(modeActive("off", ist("18:00"))).toBe(false);
    expect(modeActive("always", ist("06:00"))).toBe(true);
    expect(modeActive("night", ist("18:00"))).toBe(true);
    expect(modeActive("night", ist("06:00"))).toBe(false);
  });
});
