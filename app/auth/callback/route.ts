import { NextResponse, type NextRequest } from "next/server";

import { log } from "@/lib/log";
import { safeReturnPath } from "@/lib/redirects";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where Google OAuth returns. Exchanges the one-time code for a session
 * cookie, then continues to a same-site path only (docs/SECURITY.md §1).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const next = safeReturnPath(url.searchParams.get("next"));

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
    log.warn("auth.oauth_exchange_failed", { reason: error.code ?? "unknown" });
  }

  return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(next)}`, url.origin));
}
