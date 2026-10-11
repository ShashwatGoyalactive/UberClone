import { describe, expect, it } from "vitest";

import { newErrorId } from "@/lib/errors";
import { displayNameFromEmail, publicName } from "@/lib/names";
import { safeReturnPath } from "@/lib/redirects";
import { emailCodeSchema, emailSchema } from "@/lib/validation/auth";

describe("displayNameFromEmail", () => {
  it("turns separators into words and capitalises", () => {
    expect(displayNameFromEmail("aarav.mehta@example.com")).toBe("Aarav Mehta");
    expect(displayNameFromEmail("priya_sharma-k@example.com")).toBe("Priya Sharma K");
  });

  it("ignores plus-addressing and digit-only words", () => {
    expect(displayNameFromEmail("aarav+rides@example.com")).toBe("Aarav");
    expect(displayNameFromEmail("priya.1998@example.com")).toBe("Priya");
  });

  it("keeps digits that are part of a word (regression: e2e became Ee)", () => {
    expect(displayNameFromEmail("e2e+123@example.com")).toBe("E2e");
  });

  it("falls back when nothing usable is left", () => {
    expect(displayNameFromEmail("1234@example.com")).toBe("Comet rider");
  });
});

describe("publicName", () => {
  it("shortens the last name only when asked", () => {
    expect(publicName("Aarav Mehta", true)).toBe("Aarav M.");
    expect(publicName("Aarav Mehta", false)).toBe("Aarav Mehta");
    expect(publicName("Aarav", true)).toBe("Aarav");
  });
});

describe("safeReturnPath", () => {
  it("allows same-site paths", () => {
    expect(safeReturnPath("/ride")).toBe("/ride");
    expect(safeReturnPath("/ride/wallet?x=1")).toBe("/ride/wallet?x=1");
  });

  it("rejects anything that could leave the site", () => {
    expect(safeReturnPath("https://evil.example.com")).toBe("/ride");
    expect(safeReturnPath("//evil.example.com")).toBe("/ride");
    expect(safeReturnPath("/\\evil.example.com")).toBe("/ride");
    expect(safeReturnPath("ride")).toBe("/ride");
    expect(safeReturnPath(null)).toBe("/ride");
  });
});

describe("auth validation", () => {
  it("normalises and validates email", () => {
    expect(emailSchema.parse("  Aarav@Example.COM ")).toBe("aarav@example.com");
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("accepts only six-digit codes", () => {
    expect(emailCodeSchema.safeParse("123456").success).toBe(true);
    expect(emailCodeSchema.safeParse("12345").success).toBe(false);
    expect(emailCodeSchema.safeParse("12345a").success).toBe(false);
  });
});

describe("newErrorId", () => {
  it("is four characters with no ambiguous ones", () => {
    const id = newErrorId();
    expect(id).toMatch(/^[2-9A-HJKMNP-TV-Z]{4}$/);
  });
});
