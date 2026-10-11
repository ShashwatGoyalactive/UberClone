import { NextResponse } from "next/server";

import { newErrorId } from "@/lib/errors";
import { log } from "@/lib/log";
import { handleWebhook } from "@/lib/services/wallet";

/**
 * POST /api/payments/razorpay/webhook (docs/API.md). Razorpay's server-to-
 * server confirmation, the backstop for a browser that closed before it
 * could verify. No session: the X-Razorpay-Signature HMAC over the raw
 * body is the only credential, checked before the body is parsed.
 * Replays are no-ops (the credit is keyed on the payment ID).
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > 100_000) return new NextResponse(null, { status: 413 });
  try {
    const ok = await handleWebhook(rawBody, request.headers.get("x-razorpay-signature") ?? "");
    if (!ok) return new NextResponse(null, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("payment.webhook_failed", {
      errorId: newErrorId(),
      error: err instanceof Error ? err.name : "unknown",
    });
    // A 5xx makes Razorpay retry later, which is what we want.
    return new NextResponse(null, { status: 500 });
  }
}
