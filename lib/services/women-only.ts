import "server-only";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { log } from "@/lib/log";
import { broadcast } from "@/lib/realtime/broadcast";
import { EVENTS, topics } from "@/lib/realtime/topics";
import { addRideEvent, findRideForParticipant } from "@/lib/repositories/rides";
import { offerNextWave } from "@/lib/services/matching";
import type { WomenOnlyFallback, WomenOnlyMode } from "@/lib/women-only";

/**
 * Women-only rides (docs/PRD.md F4, docs/SECURITY.md §9).
 *
 * Matching relies only on identity_verifications.verified_female, which
 * only this service writes — never a profile field a user can edit. In
 * Comet the verification is simulated (no ID is uploaded or stored); the
 * screens say so.
 */

export async function isVerifiedFemale(userId: string): Promise<boolean> {
  const row = await db.identityVerification.findUnique({ where: { userId } });
  return row?.verifiedFemale ?? false;
}

/** The demo stand-in for a DigiLocker or ID check. Stores the outcome only. */
export async function simulateIdentityVerification(userId: string): Promise<void> {
  await db.identityVerification.upsert({
    where: { userId },
    create: { userId, verifiedFemale: true, method: "simulated" },
    update: { verifiedFemale: true, method: "simulated", verifiedAt: new Date() },
  });
  log.info("identity.verified", { method: "simulated" });
}

async function requireVerified(userId: string) {
  if (!(await isVerifiedFemale(userId))) {
    throw new AppError("FORBIDDEN", "Verify your profile to use women-only rides.");
  }
}

export type WomenOnlySettings = {
  verified: boolean;
  mode: WomenOnlyMode;
  fallback: WomenOnlyFallback;
};

export async function getWomenOnlySettings(riderId: string): Promise<WomenOnlySettings> {
  const [verified, profile] = await Promise.all([
    isVerifiedFemale(riderId),
    db.riderProfile.findUnique({
      where: { userId: riderId },
      select: { womenOnlyMode: true, womenOnlyFallback: true },
    }),
  ]);
  return {
    verified,
    mode: profile?.womenOnlyMode ?? "off",
    fallback: profile?.womenOnlyFallback ?? "ask",
  };
}

export async function setWomenOnlyPreference(
  riderId: string,
  mode: WomenOnlyMode,
  fallback: WomenOnlyFallback,
) {
  if (mode !== "off") await requireVerified(riderId);
  await db.riderProfile.upsert({
    where: { userId: riderId },
    create: { userId: riderId, womenOnlyMode: mode, womenOnlyFallback: fallback },
    update: { womenOnlyMode: mode, womenOnlyFallback: fallback },
  });
}

export async function getWomenPassengersSettings(pilotId: string) {
  const [verified, profile] = await Promise.all([
    isVerifiedFemale(pilotId),
    db.pilotProfile.findUnique({
      where: { userId: pilotId },
      select: { womenPassengersMode: true },
    }),
  ]);
  if (!profile) throw new AppError("FORBIDDEN", "You're not a Comet Pilot yet.");
  return { verified, mode: profile.womenPassengersMode };
}

export async function setWomenPassengersMode(pilotId: string, mode: WomenOnlyMode) {
  if (mode !== "off") await requireVerified(pilotId);
  const { count } = await db.pilotProfile.updateMany({
    where: { userId: pilotId },
    data: { womenPassengersMode: mode },
  });
  if (count === 0) throw new AppError("FORBIDDEN", "You're not a Comet Pilot yet.");
}

/**
 * "Match me with any Pilot": the rider's answer when no woman Pilot has
 * accepted yet. The ride stops being women-only and is offered to the
 * nearest Pilots straight away.
 */
export async function relaxWomenOnly(riderId: string, rideId: string, now = new Date()) {
  const ride = await findRideForParticipant(riderId, rideId);
  if (!ride || ride.riderId !== riderId)
    throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  const { count } = await db.ride.updateMany({
    where: { id: rideId, status: "requested", womenOnly: true },
    data: { womenOnly: false },
  });
  if (count === 0) return;
  await addRideEvent(rideId, "ride.women_only_relaxed", { id: riderId, role: "rider" });
  await offerNextWave({ ...ride, womenOnly: false }, now);
  await broadcast({
    topic: topics.ride(rideId),
    event: EVENTS.rideUpdated,
    payload: { status: "requested" },
  });
}
