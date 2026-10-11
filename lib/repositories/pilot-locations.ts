import "server-only";

import { db } from "@/lib/db";
import type { RideTier } from "@/lib/fares";
import type { LatLng } from "@/lib/geo";

/**
 * Live Pilot positions. PostGIS columns aren't expressible in Prisma's
 * query API, so these are raw SQL — parameterised with tagged templates,
 * never string-built.
 */

export async function upsertPilotLocation(
  pilotId: string,
  point: LatLng,
  opts: { headingDeg?: number | null; speedKmh?: number | null; isOnline: boolean },
): Promise<void> {
  await db.$executeRaw`
    INSERT INTO pilot_locations (pilot_id, location_point, heading_deg, speed_kmh, is_online, is_available, updated_at)
    VALUES (
      ${pilotId}::uuid,
      ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography,
      ${opts.headingDeg ?? null}, ${opts.speedKmh ?? null}, ${opts.isOnline}, true, now()
    )
    ON CONFLICT (pilot_id) DO UPDATE SET
      location_point = EXCLUDED.location_point,
      heading_deg = EXCLUDED.heading_deg,
      speed_kmh = EXCLUDED.speed_kmh,
      is_online = EXCLUDED.is_online,
      updated_at = now()
  `;
}

export async function setPilotOnline(pilotId: string, isOnline: boolean): Promise<void> {
  await db.$executeRaw`
    UPDATE pilot_locations SET is_online = ${isOnline}, updated_at = now() WHERE pilot_id = ${pilotId}::uuid
  `;
}

export async function setPilotAvailable(pilotId: string, isAvailable: boolean): Promise<void> {
  await db.$executeRaw`
    UPDATE pilot_locations SET is_available = ${isAvailable} WHERE pilot_id = ${pilotId}::uuid
  `;
}

export type PilotLocationRow = {
  point: LatLng;
  headingDeg: number | null;
  isOnline: boolean;
  isAvailable: boolean;
  updatedAt: Date;
};

export async function getPilotLocation(pilotId: string): Promise<PilotLocationRow | null> {
  const rows = await db.$queryRaw<
    {
      lat: number;
      lng: number;
      heading_deg: number | null;
      is_online: boolean;
      is_available: boolean;
      updated_at: Date;
    }[]
  >`
    SELECT ST_Y(location_point::geometry) AS lat, ST_X(location_point::geometry) AS lng,
           heading_deg, is_online, is_available, updated_at
    FROM pilot_locations WHERE pilot_id = ${pilotId}::uuid
  `;
  const r = rows[0];
  if (!r) return null;
  return {
    point: { lat: r.lat, lng: r.lng },
    headingDeg: r.heading_deg,
    isOnline: r.is_online,
    isAvailable: r.is_available,
    updatedAt: r.updated_at,
  };
}

export type Candidate = { pilotId: string; distanceM: number };

/**
 * The nearest eligible Pilots: online, available, approved, on the right
 * tier, with a fresh position, within the radius, nearest first. Uses the
 * partial GIST index on pilot_locations.
 */
export async function findNearestPilots(params: {
  point: LatLng;
  tier: RideTier;
  radiusM: number;
  freshSeconds: number;
  limit: number;
  excludePilotIds: string[];
}): Promise<Candidate[]> {
  const { point, tier, radiusM, freshSeconds, limit, excludePilotIds } = params;
  const exclude = excludePilotIds.length
    ? excludePilotIds
    : ["00000000-0000-0000-0000-000000000000"];
  return db.$queryRaw<Candidate[]>`
    WITH here AS (
      SELECT ST_SetSRID(ST_MakePoint(${point.lng}, ${point.lat}), 4326)::geography AS g
    )
    SELECT pl.pilot_id AS "pilotId",
           ST_Distance(pl.location_point, here.g)::float8 AS "distanceM"
    FROM pilot_locations pl
    JOIN pilot_profiles pp ON pp.user_id = pl.pilot_id
    CROSS JOIN here
    WHERE pl.is_online AND pl.is_available
      AND pp.status = 'approved'
      AND pp.tier = ${tier}::ride_tier
      AND pl.updated_at > now() - make_interval(secs => ${freshSeconds})
      AND ST_DWithin(pl.location_point, here.g, ${radiusM})
      AND pl.pilot_id <> ALL(${exclude}::uuid[])
    ORDER BY pl.location_point <-> here.g
    LIMIT ${limit}
  `;
}
