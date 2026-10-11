import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * Supabase exposes every table in `public` through its REST API, reachable
 * with the anon key that ships to every browser. Row-level security with
 * no policies is what keeps that door shut (docs/SECURITY.md §2). These
 * tests fail the moment a migration adds a table and forgets.
 */

const url =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54330/comet_test";
let client: Client;

beforeAll(async () => {
  client = new Client({ connectionString: url });
  await client.connect();
});

afterAll(async () => {
  await client.end();
});

describe("row-level security baseline", () => {
  it("is enabled on every table in public, including Prisma's own", async () => {
    const { rows } = await client.query<{ relname: string; relrowsecurity: boolean }>(`
      SELECT c.relname, c.relrowsecurity
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `);
    expect(rows.length).toBeGreaterThan(0);
    const missing = rows.filter((r) => !r.relrowsecurity).map((r) => r.relname);
    expect(missing).toEqual([]);
  });

  it("has no policies, so nothing is readable through the REST API", async () => {
    const { rows } = await client.query(
      `SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'`,
    );
    expect(rows).toEqual([]);
  });

  it("returns no rows to the anon role even when rows exist", async () => {
    await client.query(`
      INSERT INTO users (id, comet_id, display_name, updated_at)
      VALUES (gen_random_uuid(), 'CMT-TEST01', 'RLS probe', now())
    `);
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE anon");
    const { rows } = await client.query("SELECT * FROM users");
    await client.query("ROLLBACK");
    expect(rows).toEqual([]);
    await client.query("DELETE FROM users WHERE comet_id = 'CMT-TEST01'");
  });
});
