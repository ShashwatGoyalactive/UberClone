import { NextResponse } from "next/server";

import { getSharedTrip } from "@/lib/services/share";

/**
 * GET /api/share/[token] — the shared-trip page's poll. Public: the token
 * is the only credential. Never cached, so a revoked or expired link stops
 * working at once.
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/share/[token]">) {
  const { token } = await ctx.params;
  const trip = await getSharedTrip(token);
  return NextResponse.json(trip, {
    status: trip.state === "invalid" ? 404 : 200,
    headers: { "Cache-Control": "no-store" },
  });
}
