import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { getCurrentUser } from "@/lib/auth/session";
import { AppError, newErrorId } from "@/lib/errors";
import { log } from "@/lib/log";
import { tickDemoRide } from "@/lib/services/demo-sim";

/**
 * POST /api/demo/tick — advance a demo ride's simulated Pilot
 * (docs/API.md). Only the ride's own demo rider may call it, and only for
 * demo rides; anything else is a 404 so ride IDs can't be probed.
 */

const bodySchema = z.object({ rideId: z.uuid() });

const STATUS: Partial<Record<AppError["code"], number>> = {
  UNAUTHENTICATED: 401,
  NOT_FOUND: 404,
  VALIDATION: 400,
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "VALIDATION" }, { status: 400 });

  try {
    const ride = await tickDemoRide(user.id, parsed.data.rideId);
    return NextResponse.json({ ride });
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ error: err.code }, { status: STATUS[err.code] ?? 409 });
    }
    const errorId = newErrorId();
    log.error("demo.tick.failed", { errorId, error: err instanceof Error ? err.name : "unknown" });
    return NextResponse.json({ error: "INTERNAL", errorId }, { status: 500 });
  }
}
