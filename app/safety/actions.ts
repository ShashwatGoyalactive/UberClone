"use server";

import { runAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { createShareLink } from "@/lib/services/share";
import { endSos, raiseSos, setSafetyPin } from "@/lib/services/sos";
import { rideIdSchema } from "@/lib/validation/rides";
import { endSosSchema, raiseSosSchema, setPinSchema } from "@/lib/validation/safety";

/** Safety actions shared by the rider and Pilot apps (docs/API.md "Safety"). */

async function requireUserId() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
  return user.id;
}

/** Never rate limited. The client retries until this succeeds. */
export async function raiseSosAction(input: unknown) {
  return runAction("sos.raise", async () => {
    const userId = await requireUserId();
    const parsed = raiseSosSchema.safeParse(input);
    if (!parsed.success) throw new AppError("NOT_FOUND", "That ride doesn't exist.");
    return raiseSos(userId, parsed.data.rideId, {
      reason: parsed.data.reason,
      point: parsed.data.point,
    });
  });
}

export async function endSosAction(input: unknown) {
  return runAction("sos.end", async () => {
    const userId = await requireUserId();
    const parsed = endSosSchema.safeParse(input);
    if (!parsed.success) throw new AppError("INVALID_CODE", "Enter your 4-digit safety PIN.");
    await endSos(userId, parsed.data.alertId, parsed.data.pin);
    return { ended: true };
  });
}

export async function setSafetyPinAction(input: unknown) {
  return runAction("safety.pin", async () => {
    const userId = await requireUserId();
    const parsed = setPinSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Your PIN must be 4 digits.");
    await setSafetyPin(userId, parsed.data.pin, parsed.data.currentPin);
    return { saved: true };
  });
}

export async function createShareLinkAction(input: unknown) {
  return runAction("share.create", async () => {
    const userId = await requireUserId();
    const parsed = rideIdSchema.safeParse(input);
    if (!parsed.success) throw new AppError("NOT_FOUND", "That ride doesn't exist.");
    return createShareLink(userId, parsed.data.rideId);
  });
}
