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
  return new PrismaClient({ adapter: new PrismaPg(poolConfig(connectionString)) });
}

/**
 * TLS for the cloud database, with the certificate actually verified.
 *
 * Supabase signs its database certificates with its own CA, which isn't
 * in Node's trust store, so a plain `sslmode=require` URL fails with
 * "self-signed certificate in certificate chain". The common fix online
 * is `rejectUnauthorized: false` — encryption with no idea who's on the
 * other end, a man-in-the-middle away from useless. Instead the CA is
 * supplied (DATABASE_CA_CERT, from Supabase → Database settings → SSL)
 * and verified.
 *
 * The URL's own sslmode is removed when a CA is given, because pg lets
 * the connection string override the ssl option. Locally there's no TLS
 * and no CA, and the URL is used as-is.
 */
export function poolConfig(connectionString: string) {
  const ca = process.env.DATABASE_CA_CERT?.replace(/\\n/g, "\n").trim();
  if (!ca) return { connectionString };
  const url = new URL(connectionString);
  url.searchParams.delete("sslmode");
  return { connectionString: url.toString(), ssl: { ca, rejectUnauthorized: true } };
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
