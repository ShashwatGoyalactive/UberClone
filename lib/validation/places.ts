import { z } from "zod";

import { INDIA_BOUNDS } from "@/lib/geo";

/** Shared by forms and Server Actions for places and quotes. */

export const latLngSchema = z.object({
  lat: z.number().min(INDIA_BOUNDS.minLat).max(INDIA_BOUNDS.maxLat),
  lng: z.number().min(INDIA_BOUNDS.minLng).max(INDIA_BOUNDS.maxLng),
});

export const placeInputSchema = z.object({
  address: z.string().trim().min(1).max(200),
  point: latLngSchema,
});

export const quoteRequestSchema = z.object({
  pickup: placeInputSchema,
  drop: placeInputSchema,
});

export const searchPlacesSchema = z.object({
  query: z.string().trim().min(3).max(100),
  near: latLngSchema.optional(),
});
