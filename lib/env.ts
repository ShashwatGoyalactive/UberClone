import "server-only";

import { z } from "zod";

import { parseAppEnv } from "@/lib/app-env";

/**
 * Server environment, validated once on first use.
 *
 * Lazy on purpose: CI builds the app with no secrets at all
 * (docs/ENVIRONMENTS.md), so nothing may read these at import time or
 * during the build. A missing variable fails the first request that
 * needs it, with a message naming the variable, instead of failing a
 * build that never needed it.
 *
 * Only keys needed by code that exists today are required here. Mapbox
 * and Razorpay join the schema in the phases that use them.
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  DATABASE_URL: z.string().startsWith("postgres"),
  NEXT_PUBLIC_APP_URL: z.url(),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Invalid or missing environment variables: ${missing}. ` +
        "Copy .env.example to .env.local and fill them in (npx supabase status prints the local values).",
    );
  }
  cached = parsed.data;
  return cached;
}

/** Never throws: an unset APP_ENV reads as "dev". */
export function appEnv() {
  return parseAppEnv(process.env.APP_ENV);
}
