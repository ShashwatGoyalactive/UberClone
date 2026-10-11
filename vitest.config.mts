import { defineConfig } from "vitest/config";

/**
 * Two suites, deliberately separate (same shape as Krama).
 *
 * unit — pure: no database, no network, milliseconds. Safe anywhere.
 * integration — a real Postgres (Docker, see `npm run db:test:up`),
 * because the bugs that matter here are queries that quietly match
 * nothing, ownership checks never reached, and constraints that don't
 * fire. None of that shows up with Prisma mocked.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          setupFiles: ["tests/unit/setup.ts"],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.int.test.ts"],
          globalSetup: ["tests/integration/global-setup.ts"],
          setupFiles: ["tests/unit/setup.ts"],
          // One file at a time: they share a database, and a suite that
          // passes only when the machine is fast is not a suite.
          fileParallelism: false,
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
