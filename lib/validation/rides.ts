import { z } from "zod";

import { RIDE_TIERS } from "@/lib/fares";
import { latLngSchema } from "@/lib/validation/places";
import { PAYMENT_METHODS } from "@/lib/wallet";

/** Shared by forms and Server Actions for booking, offers and locations. */

export const bookRideSchema = z.object({
  quoteId: z.uuid(),
  tier: z.enum(RIDE_TIERS),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

export const rideIdSchema = z.object({ rideId: z.uuid() });

export const cancelRideSchema = z.object({
  rideId: z.uuid(),
  reason: z.string().trim().min(1).max(200).default("Cancelled by rider"),
});

export const offerIdSchema = z.object({ offerId: z.uuid() });

export const setOnlineSchema = z.object({
  online: z.boolean(),
  point: latLngSchema.optional(),
});

export const locationUpdateSchema = z.object({
  point: latLngSchema,
  headingDeg: z.number().min(0).max(360).nullable().default(null),
  speedKmh: z.number().min(0).max(250).nullable().default(null),
});

export const startTripSchema = z.object({
  rideId: z.uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d{4}$/),
});
