"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase client for the browser. Sign-in calls (anonymous demo, email
 * code) go through this one on purpose: Supabase rate-limits them per IP
 * address, and from the server every visitor would share Vercel's IPs —
 * a handful of demos an hour would lock everyone out.
 *
 * Only the two public values are used here; the anon key can read
 * nothing because every table has RLS with no policies.
 */
let client: ReturnType<typeof createBrowserClient> | undefined;

export function supabaseBrowser() {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
