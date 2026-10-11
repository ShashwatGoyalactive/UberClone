/**
 * Small, pure geometry helpers. Browser-safe.
 *
 * Real routes come from Mapbox Directions. These exist for the fallback
 * when routing is unavailable (docs/ARCHITECTURE.md §12: straight-line
 * distance × 1.3, flagged as an estimate) and for the simulated Pilot,
 * which walks along a route by distance.
 */

export type LatLng = { lat: number; lng: number };

/** HSR Layout, Bengaluru — where maps open when location is unavailable. */
export const DEFAULT_CENTER: LatLng = { lat: 12.9116, lng: 77.6474 };

const EARTH_RADIUS_M = 6_371_008.8;

/** Bounding box Comet accepts coordinates in (docs/DATABASE.md §7). */
export const INDIA_BOUNDS = { minLat: 6, maxLat: 37, minLng: 68, maxLng: 98 } as const;

export function isInIndia(p: LatLng): boolean {
  return (
    p.lat >= INDIA_BOUNDS.minLat &&
    p.lat <= INDIA_BOUNDS.maxLat &&
    p.lng >= INDIA_BOUNDS.minLng &&
    p.lng <= INDIA_BOUNDS.maxLng
  );
}

/** Great-circle distance in metres. */
export function haversineM(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Roads are longer than straight lines; 1.3 is a common urban detour factor. */
export const ROAD_DETOUR_FACTOR = 1.3;

/** Average city speed used only for estimates when routing is down. */
export const FALLBACK_SPEED_KMH = 20;

export function estimateRoad(a: LatLng, b: LatLng) {
  const distanceM = Math.round(haversineM(a, b) * ROAD_DETOUR_FACTOR);
  const durationS = Math.round(distanceM / ((FALLBACK_SPEED_KMH * 1000) / 3600));
  return { distanceM, durationS };
}

/** Total length of a polyline in metres. */
export function lineLengthM(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += haversineM(points[i - 1]!, points[i]!);
  return total;
}

/**
 * The point `distanceM` metres along a polyline, plus the heading of the
 * segment it's on. Clamps to the ends. Used to place the simulated Pilot.
 */
export function pointAlong(
  points: LatLng[],
  distanceM: number,
): { point: LatLng; headingDeg: number } {
  if (points.length === 0) throw new RangeError("Empty line.");
  if (points.length === 1 || distanceM <= 0) {
    return {
      point: points[0]!,
      headingDeg: points.length > 1 ? bearingDeg(points[0]!, points[1]!) : 0,
    };
  }
  let remaining = distanceM;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!;
    const b = points[i]!;
    const seg = haversineM(a, b);
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : remaining / seg;
      return {
        point: { lat: a.lat + (b.lat - a.lat) * t, lng: a.lng + (b.lng - a.lng) * t },
        headingDeg: bearingDeg(a, b),
      };
    }
    remaining -= seg;
  }
  const last = points[points.length - 1]!;
  return { point: last, headingDeg: bearingDeg(points[points.length - 2]!, last) };
}

/** Initial compass bearing from a to b, 0–360°. */
export function bearingDeg(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}
