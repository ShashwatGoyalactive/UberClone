import { describe, expect, it } from "vitest";

import {
  COMET_ID_ALPHABET,
  COMET_ID_PATTERN,
  generateCometId,
  parseCometId,
  secureRandom,
} from "@/lib/comet-id";

/** A seeded generator so failures reproduce. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

describe("generateCometId", () => {
  it("produces CMT- plus six characters from the Crockford alphabet", () => {
    const random = seeded(42);
    for (let i = 0; i < 1000; i++) {
      expect(generateCometId(random)).toMatch(COMET_ID_PATTERN);
    }
  });

  it("never uses the ambiguous letters I, L, O or U", () => {
    expect(COMET_ID_ALPHABET).toHaveLength(32);
    expect(COMET_ID_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it("maps the edges of [0, 1) to the first and last characters", () => {
    expect(generateCometId(() => 0)).toBe("CMT-000000");
    expect(generateCometId(() => 0.999999)).toBe("CMT-ZZZZZZ");
  });

  it("is deterministic for a given random source", () => {
    expect(generateCometId(seeded(7))).toBe(generateCometId(seeded(7)));
  });

  it("works with the secure source", () => {
    expect(generateCometId(secureRandom)).toMatch(COMET_ID_PATTERN);
  });
});

describe("parseCometId", () => {
  it("accepts a well-formed ID unchanged", () => {
    expect(parseCometId("CMT-7K4Q9X")).toBe("CMT-7K4Q9X");
  });

  it("normalises case, spacing and a missing prefix", () => {
    expect(parseCometId("cmt-7k4q9x")).toBe("CMT-7K4Q9X");
    expect(parseCometId(" 7K4 Q9X ")).toBe("CMT-7K4Q9X");
    expect(parseCometId("cmt7k4q9x")).toBe("CMT-7K4Q9X");
  });

  it("maps look-alike letters back to digits", () => {
    expect(parseCometId("CMT-OI0L23")).toBe("CMT-010123");
  });

  it("rejects wrong lengths and letters outside the alphabet", () => {
    expect(parseCometId("CMT-7K4Q9")).toBeNull();
    expect(parseCometId("CMT-7K4Q9XX")).toBeNull();
    expect(parseCometId("CMT-7K4Q9U")).toBeNull();
    expect(parseCometId("")).toBeNull();
  });
});
