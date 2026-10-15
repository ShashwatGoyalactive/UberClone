import { z } from "zod";

import { SOS_REASON_IDS } from "@/lib/safety";
import { latLngSchema } from "@/lib/validation/places";

/**
 * Safety inputs (docs/API.md "Safety"). The SOS schema is deliberately
 * forgiving: only the ride ID is required, and a bad reason or position
 * is dropped rather than refusing the alert (docs/SECURITY.md §9).
 */

export const raiseSosSchema = z.object({
  rideId: z.uuid(),
  reason: z.enum(SOS_REASON_IDS).nullable().catch(null).default(null),
  point: latLngSchema.nullable().catch(null).default(null),
});

export const endSosSchema = z.object({
  alertId: z.uuid(),
  pin: z.string().regex(/^\d{4}$/),
});

export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
  currentPin: z
    .string()
    .regex(/^\d{4}$/)
    .nullable()
    .default(null),
});

const mode = z.enum(["off", "always", "night"]);

export const womenOnlyPreferenceSchema = z.object({
  mode,
  fallback: z.enum(["ask", "wait"]),
});

export const womenPassengersSchema = z.object({ mode });
