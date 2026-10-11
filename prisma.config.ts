import { defineConfig } from "prisma/config";

// Prisma 7 no longer loads env files by itself. Next reads .env.local for
// the app, so the CLI reads the same file; in CI and on Vercel the
// variables are already in the environment and the file doesn't exist.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No file — use the environment as-is.
}

/**
 * Migrations only. The running app never uses this — it connects through
 * the driver adapter in lib/db.ts.
 *
 * Migrations need the *direct* connection (port 5432). Supabase's pooled
 * URL runs Supavisor in transaction mode, which can't run DDL, and the
 * failure message never mentions pooling. Locally there is no pooler, so
 * DIRECT_URL and DATABASE_URL are the same string.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
  migrations: {
    path: "prisma/migrations",
  },
});
