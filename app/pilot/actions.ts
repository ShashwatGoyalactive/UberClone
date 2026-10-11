"use server";

import { runAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import {
  acceptOffer,
  declineOffer,
  getPilotActiveRide,
  goOffline,
  goOnline,
  listOpenOffers,
  updatePilotLocation,
} from "@/lib/services/pilots";
import { locationUpdateSchema, offerIdSchema, setOnlineSchema } from "@/lib/validation/rides";

/** Pilot actions (docs/API.md "Rides (Pilot)"). */

async function requirePilotUser() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
  return user;
}

export async function setOnlineAction(input: unknown) {
  return runAction("pilot.online", async () => {
    const user = await requirePilotUser();
    const parsed = setOnlineSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Couldn't change your status.");
    if (parsed.data.online) {
      if (!parsed.data.point) throw new AppError("VALIDATION", "Waiting for your location…");
      await goOnline(user.id, parsed.data.point);
    } else {
      await goOffline(user.id);
    }
    return { online: parsed.data.online };
  });
}

export async function updateLocationAction(input: unknown) {
  return runAction("pilot.location", async () => {
    const user = await requirePilotUser();
    const parsed = locationUpdateSchema.safeParse(input);
    if (!parsed.success) return { ok: false };
    await updatePilotLocation(
      user.id,
      parsed.data.point,
      parsed.data.headingDeg,
      parsed.data.speedKmh,
    );
    return { ok: true };
  });
}

export async function listOffersAction() {
  return runAction("pilot.offers", async () => {
    const user = await requirePilotUser();
    return listOpenOffers(user.id);
  });
}

export async function acceptOfferAction(input: unknown) {
  return runAction("pilot.accept", async () => {
    const user = await requirePilotUser();
    const parsed = offerIdSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "That request isn't valid.");
    return acceptOffer(user.id, parsed.data.offerId);
  });
}

export async function declineOfferAction(input: unknown) {
  return runAction("pilot.decline", async () => {
    const user = await requirePilotUser();
    const parsed = offerIdSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "That request isn't valid.");
    await declineOffer(user.id, parsed.data.offerId);
    return { declined: true };
  });
}

export async function getPilotActiveRideAction() {
  return runAction("pilot.active_ride", async () => {
    const user = await requirePilotUser();
    return getPilotActiveRide(user.id);
  });
}
