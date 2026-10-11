import "server-only";

import { randomInt } from "node:crypto";

import { AppError } from "@/lib/errors";
import type { RideTier } from "@/lib/fares";
import { publicName } from "@/lib/names";
import type { LatLng } from "@/lib/geo";
import { broadcast } from "@/lib/realtime/broadcast";
import { EVENTS, topics } from "@/lib/realtime/topics";
import { getPilotLocation, setPilotAvailable } from "@/lib/repositories/pilot-locations";
import {
  ActiveRideExistsError,
  addRideEvent,
  closeOtherOffers,
  findActiveRideForRider,
  findRideForParticipant,
  insertRide,
  transitionRide,
  type RideWithPilot,
} from "@/lib/repositories/rides";
import { findUser } from "@/lib/repositories/users";
import { isActive, type RideStatus } from "@/lib/ride-state";
import { offerNextWave, refreshRequestedRide } from "@/lib/services/matching";
import { getValidQuote } from "@/lib/services/quotes";

/**
 * The rider's side of a ride: book from a locked quote, follow it, cancel.
 */

export type RideView = {
  id: string;
  status: RideStatus;
  tier: RideTier;
  pickup: { address: string; point: LatLng };
  drop: { address: string; point: LatLng };
  routeCoordinates: [number, number][];
  distanceM: number;
  durationS: number;
  totalPaise: number;
  paymentMethod: string;
  /** Only ever present in the rider's own view (docs/DATABASE.md §10). */
  rideCode?: string;
  pilot?: {
    name: string;
    cometId: string;
    rating: number | null;
    vehicle: string;
    plate: string;
    point: LatLng | null;
  };
};

export async function toRideView(ride: RideWithPilot, forRider: boolean): Promise<RideView> {
  const pilotLocation = ride.pilot ? await getPilotLocation(ride.pilot.id) : null;
  const profile = ride.pilot?.pilotProfile;
  return {
    id: ride.id,
    status: ride.status,
    tier: ride.tier as RideTier,
    pickup: { address: ride.pickupAddress, point: { lat: ride.pickupLat, lng: ride.pickupLng } },
    drop: { address: ride.dropAddress, point: { lat: ride.dropLat, lng: ride.dropLng } },
    routeCoordinates: ride.routeCoordinates as [number, number][],
    distanceM: ride.distanceM,
    durationS: ride.durationS,
    totalPaise: ride.totalPaise,
    paymentMethod: ride.paymentMethod,
    ...(forRider ? { rideCode: ride.rideCode } : {}),
    ...(ride.pilot && profile
      ? {
          pilot: {
            name: publicName(ride.pilot.displayName, ride.pilot.hideLastName),
            cometId: ride.pilot.cometId,
            rating: profile.ratingAvg ? Number(profile.ratingAvg) : null,
            vehicle: `${profile.vehicleColour ?? ""} ${profile.vehicleModel ?? ""}`.trim(),
            plate: profile.plate ?? "",
            point: pilotLocation?.point ?? null,
          },
        }
      : {}),
  };
}

export type BookInput = {
  quoteId: string;
  tier: RideTier;
  paymentMethod: "cash";
};

/** Books a ride from a locked quote and offers it to the first wave. */
export async function bookRide(riderId: string, input: BookInput, now: Date = new Date()) {
  const rider = await findUser(riderId);
  if (!rider) throw new AppError("UNAUTHENTICATED", "Please sign in again.");

  const existing = await findActiveRideForRider(riderId);
  if (existing) {
    throw new AppError("CONFLICT", "You already have a ride in progress.");
  }

  const quote = await getValidQuote(riderId, input.quoteId, now);
  const prices = quote.prices as Record<RideTier, number>;
  const fare = prices[input.tier];
  if (typeof fare !== "number") throw new AppError("VALIDATION", "That ride type isn't available.");

  let ride;
  try {
    ride = await insertRide(
      {
        riderId,
        quoteId: quote.id,
        tier: input.tier,
        pickupAddress: quote.pickupAddress,
        pickupLat: quote.pickupLat,
        pickupLng: quote.pickupLng,
        dropAddress: quote.dropAddress,
        dropLat: quote.dropLat,
        dropLng: quote.dropLng,
        routeCoordinates: quote.routeCoordinates as [number, number][],
        distanceM: quote.distanceM,
        durationS: quote.durationS,
        farePaise: fare,
        totalPaise: fare,
        paymentMethod: input.paymentMethod,
        rideCode: String(randomInt(0, 10_000)).padStart(4, "0"),
        isDemo: rider.isDemo,
        requestedAt: now,
      },
      { actorId: riderId, type: "ride.requested" },
    );
  } catch (err) {
    // Two taps at once: the unique active-ride index let only one through.
    if (err instanceof ActiveRideExistsError) {
      throw new AppError("CONFLICT", "You already have a ride in progress.");
    }
    throw err;
  }

  await offerNextWave(ride, now);
  return { rideId: ride.id };
}

/** The rider's active ride, moved along if it's still waiting for a Pilot. */
export async function getRiderActiveRide(
  riderId: string,
  now: Date = new Date(),
): Promise<RideView | null> {
  let ride = await findActiveRideForRider(riderId);
  if (!ride) return null;
  if (ride.status === "requested") {
    const status = await refreshRequestedRide(ride, now);
    if (status !== "requested") ride = await findRideForParticipant(riderId, ride.id);
  }
  // Refreshing can end the ride (it expired); an ended ride isn't active.
  if (!ride || !isActive(ride.status)) return null;
  return toRideView(ride, true);
}

/** One ride the rider took part in, active or finished (for the trip screen). */
export async function getRiderRide(riderId: string, rideId: string, now: Date = new Date()) {
  let ride = await findRideForParticipant(riderId, rideId);
  if (!ride || ride.riderId !== riderId)
    throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  if (ride.status === "requested") {
    await refreshRequestedRide(ride, now);
    ride = (await findRideForParticipant(riderId, rideId))!;
  }
  return toRideView(ride, true);
}

/**
 * Cancels before the trip starts. Cancellation fees (docs/PRD.md F5) come
 * with phase 7; until then cancelling is free.
 */
export async function cancelRideAsRider(
  riderId: string,
  rideId: string,
  reason: string,
  now = new Date(),
) {
  const ride = await findRideForParticipant(riderId, rideId);
  if (!ride || ride.riderId !== riderId)
    throw new AppError("NOT_FOUND", "That ride doesn't exist.");
  if (ride.status !== "requested" && ride.status !== "accepted") {
    throw new AppError("CONFLICT", "This ride can't be cancelled now.");
  }

  const ok = await transitionRide(ride.id, ride.status, {
    status: "cancelled",
    cancelledAt: now,
    cancelledBy: "rider",
    cancelReason: reason.slice(0, 200),
  });
  if (!ok) throw new AppError("CONFLICT", "Your ride changed just now. Please check its status.");

  const closed = await closeOtherOffers(ride.id, null, "expired");
  if (ride.pilotId) await setPilotAvailable(ride.pilotId, true);
  await addRideEvent(ride.id, "ride.cancelled", { id: riderId, role: "rider" }, { reason });
  await broadcast(
    { topic: topics.ride(ride.id), event: EVENTS.rideUpdated, payload: { status: "cancelled" } },
    ...closed.map((o) => ({
      topic: topics.pilot(o.pilotId),
      event: EVENTS.offerGone,
      payload: { offerId: o.id },
    })),
  );
}
