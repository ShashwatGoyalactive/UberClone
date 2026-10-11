"use client";

import { useEffect, useEffectEvent } from "react";

import { supabaseBrowser } from "@/lib/supabase/browser";

/**
 * Keeps a screen in sync with the server: subscribes to a private Realtime
 * channel and refreshes on any event, and also polls on an interval.
 *
 * Polling is the guarantee and Realtime the speed-up (docs/ARCHITECTURE.md
 * §12): if the socket drops, is blocked, or a message is lost, the screen
 * still catches up within `pollMs`. Nothing is read from the message
 * itself — it only says "something changed, ask the server".
 */
export function useLive(topic: string | null, refresh: () => void, pollMs = 4_000) {
  const onChange = useEffectEvent(refresh);

  useEffect(() => {
    const timer = setInterval(() => onChange(), pollMs);
    return () => clearInterval(timer);
  }, [pollMs]);

  useEffect(() => {
    if (!topic) return;
    const supabase = supabaseBrowser();
    let cancelled = false;
    const channel = supabase.channel(topic, { config: { private: true } });

    (async () => {
      // Private channels authorise with the user's access token.
      await supabase.realtime.setAuth();
      if (cancelled) return;
      channel.on("broadcast", { event: "*" }, () => onChange()).subscribe();
    })();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [topic]);
}
