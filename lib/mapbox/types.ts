import type { LatLng } from "@/lib/geo";

/**
 * What Comet needs from a maps provider. The real implementation calls
 * Mapbox (server-side, with the secret token); the fake is deterministic
 * and offline, used by tests and whenever COMET_FAKE_EXTERNALS=1
 * (docs/TESTING.md §2).
 */

export type Route = {
  distanceM: number;
  durationS: number;
  /** [lng, lat] pairs, GeoJSON order, ready for a map line layer. */
  coordinates: [number, number][];
  /** True when routing was unavailable and this is a straight-line estimate. */
  isEstimate: boolean;
};

export type Place = {
  id: string;
  name: string;
  address: string;
  point: LatLng;
};

export interface MapsProvider {
  route(from: LatLng, to: LatLng): Promise<Route | null>;
  searchPlaces(query: string, near?: LatLng): Promise<Place[]>;
}
