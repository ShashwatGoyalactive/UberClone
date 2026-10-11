"use server";

import { runAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { quoteFare, searchPlaces } from "@/lib/services/quotes";
import { bookRide, cancelRideAsRider, getRiderActiveRide } from "@/lib/services/rides";
import { quoteRequestSchema, searchPlacesSchema } from "@/lib/validation/places";
import { bookRideSchema, cancelRideSchema } from "@/lib/validation/rides";

/** Rider actions (docs/API.md "Places and quotes", "Rides (rider)"). */

async function requireRider() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
  return user;
}

export async function searchPlacesAction(input: unknown) {
  return runAction("places.search", async () => {
    await requireRider();
    const parsed = searchPlacesSchema.safeParse(input);
    if (!parsed.success) return [];
    return searchPlaces(parsed.data.query, parsed.data.near);
  });
}

export async function quoteFareAction(input: unknown) {
  return runAction("quote.create", async () => {
    const user = await requireRider();
    const parsed = quoteRequestSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", "Choose a pickup and a drop in India to see prices.");
    }
    return quoteFare(user.id, parsed.data.pickup, parsed.data.drop);
  });
}

export async function bookRideAction(input: unknown) {
  return runAction("ride.book", async () => {
    const user = await requireRider();
    const parsed = bookRideSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Choose a ride type to book.");
    return bookRide(user.id, parsed.data);
  });
}

/** Polled by the trip screen; also advances a ride that's waiting for a Pilot. */
export async function getActiveRideAction() {
  return runAction("ride.active", async () => {
    const user = await requireRider();
    return getRiderActiveRide(user.id);
  });
}

export async function cancelRideAction(input: unknown) {
  return runAction("ride.cancel", async () => {
    const user = await requireRider();
    const parsed = cancelRideSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "That ride can't be cancelled.");
    await cancelRideAsRider(user.id, parsed.data.rideId, parsed.data.reason);
    return { cancelled: true };
  });
}
