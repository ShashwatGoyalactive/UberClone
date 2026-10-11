import "server-only";

import { log } from "@/lib/log";

/**
 * Sends events to private Realtime channels from the server, through
 * Supabase's broadcast REST endpoint with the service-role key.
 *
 * Fire-and-forget by design: a broadcast is a nudge, never the source of
 * truth. Clients also poll the server (docs/ARCHITECTURE.md §12), so a
 * dropped message delays an update by a few seconds and corrupts nothing.
 * Disabled in tests and when COMET_FAKE_EXTERNALS is set.
 */

export type BroadcastMessage = {
  topic: string;
  event: string;
  payload: Record<string, unknown>;
};

export async function broadcast(...messages: BroadcastMessage[]): Promise<void> {
  if (messages.length === 0 || process.env.COMET_FAKE_EXTERNALS === "1") return;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;

  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        messages: messages.map((m) => ({ ...m, private: true })),
      }),
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) log.warn("realtime.broadcast_failed", { status: res.status });
  } catch (err) {
    log.warn("realtime.broadcast_failed", { reason: err instanceof Error ? err.name : "unknown" });
  }
}
