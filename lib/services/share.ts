import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { haversineM, type LatLng } from "@/lib/geo";
import { log } from "@/lib/log";
import { getPilotLocation } from "@/lib/repositories/pilot-locations";
import { findRideForParticipant } from "@/lib/repositories/rides";
import { ACTIVE_STATUSES } from "@/lib/ride-state";
import {
  SHARE_GRACE_AFTER_END_S,
  SHARE_MAX_LIFETIME_S,
  areaOf,
  firstNameLastInitial,
} from "@/lib/safety";

/**
 * "Share trip" (docs/PRD.md F9, docs/API.md GET /t/[token]). A link anyone
 * can open without an account. It carries a 32-byte random token; only
 * its SHA-256 is stored, so a database leak doesn't leak working links.
 *
 * The page shows only what someone looking out for the rider needs: the
 * Pilot's first name and initial, car and plate, the live position, the
 * area being driven to and an ETA. Never phone numbers, email, payment
 * details, the ride code, or exact addresses (docs/SECURITY.md §6).
 */

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** Tokens are 43 base64url characters; anything else can't be one. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{43}$/;

export async function createShareLink(riderId: string, rideId: string, now = new Date()) {
  const ride = await findRideForParticipant(riderId, rideId);
  if (!ride || ride.riderId !== riderId)
    throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  if (!(ACTIVE_STATUSES as readonly string[]).includes(ride.status)) {
    throw new AppError("CONFLICT", "You can share a trip while it's happening.");
  }
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SHARE_MAX_LIFETIME_S * 1000);
  await db.shareLink.create({
    data: { rideId, tokenHash: hashToken(token), createdBy: riderId, expiresAt },
  });
  log.info("share.created", {});
  return { path: `/t/${token}`, expiresAt: expiresAt.toISOString() };
}

export type SharedTrip =
  | { state: "invalid" }
  | { state: "ended"; riderFirstName: string }
  | {
      state: "live";
      riderFirstName: string;
      status: "requested" | "accepted" | "arrived" | "in_progress" | "completed";
      pilot: { name: string; vehicle: string; plate: string; rating: number | null } | null;
      car: LatLng | null;
      carUpdatedAt: string | null;
      /** The destination, blurred to about a kilometre. */
      dropArea: { name: string; point: LatLng };
      pickupArea: string;
      startedAt: string | null;
      completedAt: string | null;
      etaAt: string | null;
      kmLeft: number | null;
      progress: number;
    };

/** Rounds to 2 decimals (about 1 km), so the exact drop isn't revealed. */
const blur = (p: LatLng): LatLng => ({
  lat: Math.round(p.lat * 100) / 100,
  lng: Math.round(p.lng * 100) / 100,
});

export async function getSharedTrip(token: string, now = new Date()): Promise<SharedTrip> {
  if (!TOKEN_SHAPE.test(token)) return { state: "invalid" };
  const link = await db.shareLink.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      ride: {
        include: {
          rider: { select: { displayName: true } },
          pilot: {
            select: {
              displayName: true,
              pilotProfile: {
                select: { vehicleModel: true, vehicleColour: true, plate: true, ratingAvg: true },
              },
            },
          },
        },
      },
    },
  });
  if (!link || link.revokedAt || link.expiresAt <= now) return { state: "invalid" };

  const { ride } = link;
  const riderFirstName = ride.rider.displayName.split(" ")[0] ?? "Your friend";
  const endedAt = ride.completedAt ?? ride.cancelledAt;
  const graceOver = endedAt && now.getTime() - endedAt.getTime() > SHARE_GRACE_AFTER_END_S * 1000;
  if (ride.status !== "completed" && endedAt) return { state: "ended", riderFirstName };
  if (graceOver) return { state: "ended", riderFirstName };
  if (ride.status === "expired" || ride.status === "no_show")
    return { state: "ended", riderFirstName };

  const location = ride.pilotId ? await getPilotLocation(ride.pilotId) : null;
  const drop = { lat: ride.dropLat, lng: ride.dropLng };
  const car = ride.status === "completed" ? drop : (location?.point ?? null);

  // Distance and ETA from the car's straight-line distance to the drop,
  // allowing a fifth extra for roads, at the trip's planned average speed.
  let kmLeft: number | null = null;
  let etaAt: string | null = null;
  let progress = ride.status === "completed" ? 1 : 0;
  if (ride.status === "in_progress" && car) {
    const leftM = Math.min(ride.distanceM, haversineM(car, drop) * 1.2);
    const speed = ride.distanceM / Math.max(60, ride.durationS);
    kmLeft = Math.round(leftM / 100) / 10;
    etaAt = new Date(now.getTime() + (leftM / speed) * 1000).toISOString();
    progress = Math.max(0, Math.min(1, 1 - leftM / Math.max(1, ride.distanceM)));
  }

  const profile = ride.pilot?.pilotProfile;
  return {
    state: "live",
    riderFirstName,
    status: ride.status as "requested" | "accepted" | "arrived" | "in_progress" | "completed",
    pilot:
      ride.pilot && profile
        ? {
            name: firstNameLastInitial(ride.pilot.displayName),
            vehicle: `${profile.vehicleColour ?? ""} ${profile.vehicleModel ?? ""}`.trim(),
            plate: profile.plate ?? "",
            rating: profile.ratingAvg ? Number(profile.ratingAvg) : null,
          }
        : null,
    car,
    carUpdatedAt: ride.status === "completed" ? null : (location?.updatedAt.toISOString() ?? null),
    dropArea: { name: areaOf(ride.dropAddress), point: blur(drop) },
    pickupArea: areaOf(ride.pickupAddress),
    startedAt: ride.startedAt?.toISOString() ?? null,
    completedAt: ride.completedAt?.toISOString() ?? null,
    etaAt,
    kmLeft,
    progress,
  };
}
