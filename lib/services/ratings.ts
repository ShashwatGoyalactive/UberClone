import "server-only";

import { AppError } from "@/lib/errors";
import { log } from "@/lib/log";
import { formatRupees } from "@/lib/money";
import { PILOT_TAGS, RIDER_TAGS } from "@/lib/ratings";
import { findRideForParticipant } from "@/lib/repositories/rides";
import { rateRideOnce, walletBalance } from "@/lib/repositories/wallet";
import { announceBalance } from "@/lib/services/wallet";

/**
 * Two-way ratings after a completed ride (docs/PRD.md F7, docs/API.md
 * rateRide): once per ride per side, with optional tags, comment and — for
 * riders — a tip from the wallet that goes 100% to the Pilot.
 */

export type RateInput = {
  stars: number;
  tags: string[];
  comment?: string | null;
  tipPaise?: number;
};

export async function rateRide(userId: string, rideId: string, input: RateInput) {
  const ride = await findRideForParticipant(userId, rideId);
  if (!ride) throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  const asRider = ride.riderId === userId;

  const allowed: readonly string[] = asRider ? PILOT_TAGS : RIDER_TAGS;
  const tags = [...new Set(input.tags)].filter((t) => allowed.includes(t));
  const tip = asRider ? (input.tipPaise ?? 0) : 0;
  if (!asRider && (input.tipPaise ?? 0) > 0) {
    throw new AppError("FORBIDDEN", "Only riders can add a tip.");
  }

  const outcome = await rateRideOnce({
    rideId,
    raterId: userId,
    stars: input.stars,
    tags,
    comment: input.comment?.trim() || null,
    tipPaise: tip,
  });
  switch (outcome) {
    case "ok":
      log.info("ride.rated", { side: asRider ? "rider" : "pilot", tipped: tip > 0 });
      if (tip > 0) await announceBalance(userId);
      return;
    case "duplicate":
      throw new AppError("CONFLICT", "You've already rated this ride.");
    case "insufficient":
      throw new AppError(
        "INSUFFICIENT_BALANCE",
        `Your wallet has ${formatRupees(await walletBalance(userId))}, not enough for that tip.`,
      );
    case "not_completed":
      throw new AppError("CONFLICT", "You can rate a ride once it's finished.");
    case "not_found":
      throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  }
}
