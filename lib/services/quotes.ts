import "server-only";

import type { FareQuote } from "@prisma/client";

import { AppError } from "@/lib/errors";
import { quoteAllTiers, RIDE_TIERS, type RideTier } from "@/lib/fares";
import { haversineM, type LatLng } from "@/lib/geo";
import { maps } from "@/lib/mapbox";
import type { Place } from "@/lib/mapbox/types";
import type { Paise } from "@/lib/money";
import { findQuoteForRider, insertQuote } from "@/lib/repositories/quotes";

/**
 * Fare quotes: route the trip, price every tier, and lock the result for
 * QUOTE_TTL so what the rider sees on "4 · Choose ride" is what they pay
 * (docs/PRD.md F3).
 */

export const QUOTE_TTL_MS = 5 * 60 * 1000;

/** Pickup and drop closer than this are "the same place". */
const MIN_TRIP_M = 100;

export type PlaceInput = { address: string; point: LatLng };

export type QuoteView = {
  quoteId: string;
  distanceM: number;
  durationS: number;
  isEstimate: boolean;
  routeCoordinates: [number, number][];
  prices: Record<RideTier, Paise>;
  expiresAt: string;
};

export function toQuoteView(q: FareQuote): QuoteView {
  return {
    quoteId: q.id,
    distanceM: q.distanceM,
    durationS: q.durationS,
    isEstimate: q.isEstimate,
    routeCoordinates: q.routeCoordinates as [number, number][],
    prices: q.prices as Record<RideTier, Paise>,
    expiresAt: q.expiresAt.toISOString(),
  };
}

export async function quoteFare(
  riderId: string,
  pickup: PlaceInput,
  drop: PlaceInput,
  now: Date = new Date(),
): Promise<QuoteView> {
  if (haversineM(pickup.point, drop.point) < MIN_TRIP_M) {
    throw new AppError(
      "VALIDATION",
      "Pickup and drop are the same place. Choose a different drop.",
    );
  }

  const route = await maps().route(pickup.point, drop.point);
  if (!route) {
    throw new AppError("VALIDATION", "We can't find a road route between these points.");
  }

  // Surge is 1× until demand zones exist (phase 4).
  const fares = quoteAllTiers({ distanceM: route.distanceM, durationS: route.durationS });
  const prices = Object.fromEntries(RIDE_TIERS.map((t) => [t, fares[t].total])) as Record<
    RideTier,
    Paise
  >;

  const quote = await insertQuote({
    riderId,
    pickupAddress: pickup.address,
    pickupLat: pickup.point.lat,
    pickupLng: pickup.point.lng,
    dropAddress: drop.address,
    dropLat: drop.point.lat,
    dropLng: drop.point.lng,
    distanceM: route.distanceM,
    durationS: route.durationS,
    routeCoordinates: route.coordinates,
    isEstimate: route.isEstimate,
    prices,
    expiresAt: new Date(now.getTime() + QUOTE_TTL_MS),
  });
  return toQuoteView(quote);
}

/**
 * A quote the rider can still book with. Expired or someone else's quotes
 * are reported the same way the UI handles them: re-quote.
 */
export async function getValidQuote(riderId: string, quoteId: string, now: Date = new Date()) {
  const quote = await findQuoteForRider(riderId, quoteId);
  if (!quote) throw new AppError("NOT_FOUND", "That price is no longer available.");
  if (quote.expiresAt <= now) {
    throw new AppError("CONFLICT", "Prices have changed. We've fetched the latest ones.");
  }
  return quote;
}

export async function searchPlaces(query: string, near?: LatLng): Promise<Place[]> {
  return maps().searchPlaces(query, near);
}
