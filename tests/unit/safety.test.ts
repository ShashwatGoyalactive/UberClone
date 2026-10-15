import { describe, expect, it } from "vitest";

import { areaOf, firstNameLastInitial } from "@/lib/safety";
import { raiseSosSchema } from "@/lib/validation/safety";

describe("what a shared trip reveals", () => {
  it("shows the area of an address, never the exact place", () => {
    expect(areaOf("27th Main Road, HSR Layout, Bengaluru")).toBe("HSR Layout");
    expect(areaOf("Church Street, MG Road")).toBe("MG Road");
    expect(areaOf("MG Road Metro")).toBe("MG Road Metro");
    expect(areaOf("")).toBe("");
  });

  it("shows a first name and last initial", () => {
    expect(firstNameLastInitial("Rohan Kumar")).toBe("Rohan K.");
    expect(firstNameLastInitial("Priya Anand Sharma")).toBe("Priya S.");
    expect(firstNameLastInitial("Rohan")).toBe("Rohan");
  });
});

describe("raising an SOS is never refused over optional fields", () => {
  const rideId = "8f8e2a4e-7f5c-4c11-9a51-2a1c4f6c2b10";
  it("drops a bad reason or position instead of failing", () => {
    const parsed = raiseSosSchema.safeParse({ rideId, reason: "nonsense", point: { lat: "x" } });
    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ rideId, reason: null, point: null });
  });
});
