"use server";

import { runAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { quoteFare, searchPlaces } from "@/lib/services/quotes";
import { quoteRequestSchema, searchPlacesSchema } from "@/lib/validation/places";

/** Rider actions for planning a trip (docs/API.md "Places and quotes"). */

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
