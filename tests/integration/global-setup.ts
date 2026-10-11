import { execSync } from "node:child_process";

import { Client } from "pg";

/**
 * Builds the integration database from scratch once per run: drop the
 * public schema, then apply every migration exactly as production would
 * (`prisma migrate deploy`), so the suite also proves the migrations run
 * cleanly on an empty database.
 *
 * Points at TEST_DATABASE_URL — the throwaway PostGIS container from
 * `npm run db:test:up` locally, or the service container in CI. It
 * refuses anything that doesn't look like a local database, because
 * this function drops a schema.
 */
export default async function setup() {
  const url =
    process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54330/comet_test";
  const host = new URL(url).hostname;
  if (!["127.0.0.1", "localhost", "postgres"].includes(host)) {
    throw new Error(`Refusing to reset a non-local database (${host}).`);
  }

  const client = new Client({ connectionString: url });
  await client.connect();
  await client.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  // Supabase keeps extensions (PostGIS) in an `extensions` schema that its
  // default search_path includes. Mirror that, so unqualified `geography`
  // in migrations resolves here exactly as it does on Supabase.
  await client.query(`DROP SCHEMA IF EXISTS extensions CASCADE`);
  await client.query(
    `ALTER DATABASE "${new URL(url).pathname.slice(1)}" SET search_path TO "$user", public, extensions`,
  );
  // Supabase grants these roles access to public tables. The RLS test
  // needs them to exist to prove they can't read anything.
  await client.query(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
      IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
    END $$;
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
  `);
  await client.end();

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
  });

  process.env.DATABASE_URL = url;
}
