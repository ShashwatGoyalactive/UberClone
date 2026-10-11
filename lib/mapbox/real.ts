import "server-only";

import { estimateRoad, type LatLng } from "@/lib/geo";
import { log } from "@/lib/log";

import type { MapsProvider, Place, Route } from "./types";

/**
 * Mapbox, called from the server with the secret token so request volume
 * is ours to control and the token never reaches a browser.
 *
 * Failures degrade instead of breaking booking (docs/ARCHITECTURE.md §12):
 * a failed route becomes a straight-line estimate flagged `isEstimate`,
 * and a failed search returns nothing so the UI can fall back to saved
 * places.
 */

const TIMEOUT_MS = 5_000;
const BASE = "https://api.mapbox.com";

type DirectionsResponse = {
  code: string;
  routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
};

type SearchBoxResponse = {
  features?: {
    properties: {
      mapbox_id: string;
      name: string;
      full_address?: string;
      place_formatted?: string;
      coordinates: { latitude: number; longitude: number };
    };
  }[];
};

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store" });
    if (!res.ok) {
      log.warn("mapbox.http_error", {
        status: res.status,
        endpoint: new URL(url).pathname.split("/")[1],
      });
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    log.warn("mapbox.request_failed", { reason: err instanceof Error ? err.name : "unknown" });
    return null;
  }
}

export function createMapboxMaps(token: string): MapsProvider {
  return {
    async route(from: LatLng, to: LatLng): Promise<Route | null> {
      const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`;
      const url =
        `${BASE}/directions/v5/mapbox/driving-traffic/${coords}` +
        `?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
      const data = await getJson<DirectionsResponse>(url);

      if (data?.code === "NoRoute") return null;
      const best = data?.routes?.[0];
      if (best) {
        return {
          distanceM: Math.round(best.distance),
          durationS: Math.round(best.duration),
          coordinates: best.geometry.coordinates,
          isEstimate: false,
        };
      }

      // Mapbox unreachable or over quota: estimate so booking still works.
      const estimate = estimateRoad(from, to);
      return {
        ...estimate,
        coordinates: [
          [from.lng, from.lat],
          [to.lng, to.lat],
        ],
        isEstimate: true,
      };
    },

    async searchPlaces(query: string, near?: LatLng): Promise<Place[]> {
      const q = query.trim();
      if (q.length < 3) return [];
      const params = new URLSearchParams({
        q,
        country: "IN",
        limit: "5",
        language: "en",
        access_token: token,
      });
      if (near) params.set("proximity", `${near.lng},${near.lat}`);
      const data = await getJson<SearchBoxResponse>(
        `${BASE}/search/searchbox/v1/forward?${params}`,
      );
      return (data?.features ?? []).map((f) => ({
        id: f.properties.mapbox_id,
        name: f.properties.name,
        address: f.properties.full_address ?? f.properties.place_formatted ?? f.properties.name,
        point: { lat: f.properties.coordinates.latitude, lng: f.properties.coordinates.longitude },
      }));
    },
  };
}
