import { z } from "zod";

import type { LatLng } from "@/lib/geo";
import { latLngSchema } from "@/lib/validation/places";

/**
 * A planned trip carried in the URL between "Plan ride" and "Choose ride"
 * (?plat=&plng=&paddr=&dlat=&dlng=&daddr=), so the page can be reloaded or
 * shared within the session. Parsed and validated on the server before any
 * quote is made. Browser-safe.
 */

export type TripPlace = { address: string; point: LatLng };

const schema = z.object({
  plat: z.coerce.number(),
  plng: z.coerce.number(),
  paddr: z.string().trim().min(1).max(200),
  dlat: z.coerce.number(),
  dlng: z.coerce.number(),
  daddr: z.string().trim().min(1).max(200),
});

export function tripSearchParams(pickup: TripPlace, drop: TripPlace): string {
  const round = (n: number) => n.toFixed(6);
  return new URLSearchParams({
    plat: round(pickup.point.lat),
    plng: round(pickup.point.lng),
    paddr: pickup.address,
    dlat: round(drop.point.lat),
    dlng: round(drop.point.lng),
    daddr: drop.address,
  }).toString();
}

export function parseTripParams(
  params: Record<string, string | string[] | undefined>,
): { pickup: TripPlace; drop: TripPlace } | null {
  const flat = Object.fromEntries(
    Object.entries(params).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
  );
  const parsed = schema.safeParse(flat);
  if (!parsed.success) return null;
  const p = parsed.data;
  const pickup = latLngSchema.safeParse({ lat: p.plat, lng: p.plng });
  const drop = latLngSchema.safeParse({ lat: p.dlat, lng: p.dlng });
  if (!pickup.success || !drop.success) return null;
  return {
    pickup: { address: p.paddr, point: pickup.data },
    drop: { address: p.daddr, point: drop.data },
  };
}
