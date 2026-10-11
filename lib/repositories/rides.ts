import "server-only";

import { Prisma, type Ride, type RideOffer, type RideStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { ACTIVE_STATUSES } from "@/lib/ride-state";

/**
 * Rides, offers and ride events. Reads are scoped to a participant; state
 * changes are conditional single-statement updates (`WHERE status = …`),
 * so two requests racing to change the same ride can't both succeed.
 */

const active = { in: [...ACTIVE_STATUSES] as RideStatus[] };

export const rideWithPilot = {
  pilot: {
    select: {
      id: true,
      displayName: true,
      hideLastName: true,
      cometId: true,
      pilotProfile: {
        select: {
          vehicleModel: true,
          vehicleColour: true,
          plate: true,
          ratingAvg: true,
          tier: true,
        },
      },
    },
  },
} satisfies Prisma.RideInclude;

export type RideWithPilot = Prisma.RideGetPayload<{ include: typeof rideWithPilot }>;

export class ActiveRideExistsError extends Error {}

/** Creates the ride and its first event together. */
export async function insertRide(
  data: Prisma.RideUncheckedCreateInput,
  event: { actorId: string; type: string },
): Promise<Ride> {
  try {
    return await db.ride.create({
      data: {
        ...data,
        events: { create: { type: event.type, actorId: event.actorId, actorRole: "rider" } },
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ActiveRideExistsError();
    }
    throw err;
  }
}

export async function findActiveRideForRider(riderId: string): Promise<RideWithPilot | null> {
  return db.ride.findFirst({ where: { riderId, status: active }, include: rideWithPilot });
}

export async function findActiveRideForPilot(pilotId: string): Promise<Ride | null> {
  return db.ride.findFirst({ where: { pilotId, status: active } });
}

/** A ride the user takes part in, as rider or assigned Pilot. */
export async function findRideForParticipant(
  userId: string,
  rideId: string,
): Promise<RideWithPilot | null> {
  return db.ride.findFirst({
    where: { id: rideId, OR: [{ riderId: userId }, { pilotId: userId }] },
    include: rideWithPilot,
  });
}

/**
 * Moves a ride from one status to another only if it's still in `from`.
 * Returns false when someone else changed it first.
 */
export async function transitionRide(
  rideId: string,
  from: RideStatus,
  data: Prisma.RideUncheckedUpdateManyInput & { status: RideStatus },
): Promise<boolean> {
  const { count } = await db.ride.updateMany({ where: { id: rideId, status: from }, data });
  return count === 1;
}

/**
 * Assigns the ride to a Pilot if it's still waiting. Exactly one of any
 * number of concurrent accepts wins. Returns false if the ride was taken,
 * cancelled or expired — or if this Pilot already has an active ride
 * (the one-active-ride-per-Pilot index).
 */
export async function assignRide(rideId: string, pilotId: string, now: Date): Promise<boolean> {
  try {
    return await transitionRide(rideId, "requested", {
      status: "accepted",
      pilotId,
      acceptedAt: now,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return false;
    throw err;
  }
}

export async function addRideEvent(
  rideId: string,
  type: string,
  actor: { id: string | null; role: "rider" | "pilot" | "system" | "ops" },
  data: Prisma.InputJsonValue = {},
): Promise<void> {
  await db.rideEvent.create({
    data: { rideId, type, actorId: actor.id, actorRole: actor.role, data },
  });
}

// ---------------------------------------------------------------- offers

export async function createOffers(
  rideId: string,
  pilotIds: string[],
  wave: number,
  expiresAt: Date,
): Promise<RideOffer[]> {
  if (pilotIds.length === 0) return [];
  await db.rideOffer.createMany({
    data: pilotIds.map((pilotId) => ({ rideId, pilotId, wave, expiresAt })),
    skipDuplicates: true,
  });
  return db.rideOffer.findMany({ where: { rideId, wave, pilotId: { in: pilotIds } } });
}

export async function findOffersForRide(rideId: string): Promise<RideOffer[]> {
  return db.rideOffer.findMany({ where: { rideId }, orderBy: { offeredAt: "asc" } });
}

export type OpenOffer = RideOffer & {
  ride: Ride & {
    rider: {
      displayName: string;
      hideLastName: boolean;
      cometId: string;
      riderProfile: { ratingAvg: Prisma.Decimal | null } | null;
    };
  };
};

export async function findOpenOffersForPilot(pilotId: string, now: Date): Promise<OpenOffer[]> {
  return db.rideOffer.findMany({
    where: { pilotId, status: "offered", expiresAt: { gt: now }, ride: { status: "requested" } },
    include: {
      ride: {
        include: {
          rider: {
            select: {
              displayName: true,
              hideLastName: true,
              cometId: true,
              riderProfile: { select: { ratingAvg: true } },
            },
          },
        },
      },
    },
    orderBy: { offeredAt: "asc" },
  });
}

export async function findOfferForPilot(
  pilotId: string,
  offerId: string,
): Promise<RideOffer | null> {
  return db.rideOffer.findFirst({ where: { id: offerId, pilotId } });
}

export async function setOfferStatus(
  offerId: string,
  from: RideOffer["status"],
  to: RideOffer["status"],
  now: Date,
): Promise<boolean> {
  const { count } = await db.rideOffer.updateMany({
    where: { id: offerId, status: from },
    data: { status: to, respondedAt: now },
  });
  return count === 1;
}

/** Closes every other open offer for a ride; returns who held them. */
export async function closeOtherOffers(
  rideId: string,
  keepOfferId: string | null,
  to: "taken" | "expired",
) {
  const open = await db.rideOffer.findMany({
    where: { rideId, status: "offered", ...(keepOfferId ? { id: { not: keepOfferId } } : {}) },
    select: { id: true, pilotId: true },
  });
  if (open.length) {
    await db.rideOffer.updateMany({
      where: { id: { in: open.map((o) => o.id) }, status: "offered" },
      data: { status: to },
    });
  }
  return open;
}
