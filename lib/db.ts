import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * Connects through Supabase's pooled endpoint (Supavisor, transaction
 * mode) in the cloud, and straight to Postgres locally.
 *
 * Transaction pooling has one consequence worth knowing: Prisma's
 * interactive `$transaction(async tx => …)` is unreliable through it,
 * because statements can land on different backends. Anything that must
 * be atomic is a single SQL statement or a plpgsql function called with
 * $queryRaw (docs/ARCHITECTURE.md §9, "Money").
 *
 * The client is created on first use, not on import. Next collects page
 * data at build time, and CI builds with no database at all.
 */

declare global {
  var __cometDb: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local; for local " +
        "development use the DB URL printed by `npx supabase status`.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

function client(): PrismaClient {
  // Reused across hot reloads in development so saving a file doesn't
  // open a new pool each time.
  if (!globalThis.__cometDb) globalThis.__cometDb = createClient();
  return globalThis.__cometDb;
}

export const db: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const value = Reflect.get(client(), prop, receiver);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});
