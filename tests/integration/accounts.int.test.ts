import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { ensureAccount, setUpDemo } from "@/lib/services/accounts";

/**
 * Accounts against a real Postgres: Comet ID issuance, idempotency, the
 * demo personas, and the rules about which kind of session gets what.
 */

afterAll(async () => {
  await db.$disconnect();
});

const anon = () => ({ id: randomUUID(), email: null, isAnonymous: true });
const real = (email = `a${Date.now()}${Math.random()}@example.com`) => ({
  id: randomUUID(),
  email,
  isAnonymous: false,
});

describe("setUpDemo", () => {
  it("creates a demo rider with a Comet ID and a rider profile", async () => {
    const identity = anon();
    const user = await setUpDemo(identity, "rider");
    expect(user.isDemo).toBe(true);
    expect(user.demoRole).toBe("rider");
    expect(user.displayName).toBe("Aarav Mehta");
    expect(user.cometId).toMatch(/^CMT-[0-9A-HJKMNP-TV-Z]{6}$/);
    expect(await db.riderProfile.findUnique({ where: { userId: user.id } })).not.toBeNull();
  });

  it("creates a demo Pilot that is approved with the demo car", async () => {
    const user = await setUpDemo(anon(), "pilot");
    const pilot = await db.pilotProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect(user.displayName).toBe("Rohan Kumar");
    expect(pilot.status).toBe("approved");
    expect(pilot.plate).toBe("KA 05 MX 2841");
    expect(pilot.tier).toBe("go");
  });

  it("is idempotent: the same session keeps its account and Comet ID", async () => {
    const identity = anon();
    const first = await setUpDemo(identity, "rider");
    const second = await setUpDemo(identity, "rider");
    expect(second.cometId).toBe(first.cometId);
    expect(await db.user.count({ where: { id: identity.id } })).toBe(1);
  });

  it("switching role on the same session adds the other profile", async () => {
    const identity = anon();
    await setUpDemo(identity, "rider");
    const user = await setUpDemo(identity, "pilot");
    expect(user.demoRole).toBe("pilot");
    expect(await db.riderProfile.findUnique({ where: { userId: identity.id } })).not.toBeNull();
    expect(await db.pilotProfile.findUnique({ where: { userId: identity.id } })).not.toBeNull();
  });

  it("handles Supabase's empty-string email on anonymous users (regression)", async () => {
    // Supabase reports "" for an anonymous user's email. Two demos in a row
    // used to collide on the unique email index.
    const a = await setUpDemo({ ...anon(), email: "" as unknown as null }, "rider");
    const b = await setUpDemo({ ...anon(), email: "" as unknown as null }, "pilot");
    expect(a.email).toBeNull();
    expect(b.email).toBeNull();
  });

  it("refuses real (non-anonymous) sessions", async () => {
    await expect(setUpDemo(real(), "rider")).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("retries when a Comet ID is already taken", async () => {
    const taken = await setUpDemo(anon(), "rider");
    // First draw reproduces the taken ID; the next draws are fresh.
    const takenChars = taken.cometId.slice(4).split("");
    const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
    const queue = takenChars.map((c) => (alphabet.indexOf(c) + 0.5) / 32);
    const random = () => queue.shift() ?? Math.random();
    const user = await setUpDemo(anon(), "rider", random);
    expect(user.cometId).not.toBe(taken.cometId);
  });
});

describe("ensureAccount", () => {
  it("creates a real account on first sign-in, named from the email", async () => {
    const identity = real("priya.sharma@example.com");
    const user = await ensureAccount(identity);
    expect(user.isDemo).toBe(false);
    expect(user.displayName).toBe("Priya Sharma");
    expect(user.email).toBe("priya.sharma@example.com");
  });

  it("returns the existing account on later sign-ins", async () => {
    const identity = real();
    const first = await ensureAccount(identity);
    const again = await ensureAccount(identity);
    expect(again.cometId).toBe(first.cometId);
  });

  it("two simultaneous first requests produce one account", async () => {
    const identity = real();
    const [a, b] = await Promise.all([ensureAccount(identity), ensureAccount(identity)]);
    expect(a.id).toBe(b.id);
    expect(await db.user.count({ where: { id: identity.id } })).toBe(1);
  });

  it("won't create an account for an anonymous session", async () => {
    await expect(ensureAccount(anon())).rejects.toBeInstanceOf(AppError);
  });
});
