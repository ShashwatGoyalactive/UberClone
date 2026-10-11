import { estimateRoad, haversineM, type LatLng } from "@/lib/geo";

import type { MapsProvider, Place, Route } from "./types";

/**
 * Offline stand-in for Mapbox. Deterministic: the same inputs always give
 * the same route and the same search results, so tests and screenshots
 * are stable. Routes are an L-shaped path (east-west, then north-south),
 * which looks like a street route on the map and has a real length.
 */

/** A small gazetteer of real Bengaluru places, used by search. */
export const FAKE_PLACES: Place[] = [
  {
    id: "fake-hsr",
    name: "HSR Layout",
    address: "27th Main Road, Sector 2, HSR Layout",
    point: { lat: 12.9116, lng: 77.6474 },
  },
  {
    id: "fake-indiranagar-metro",
    name: "Indiranagar Metro",
    address: "100 Feet Road, Indiranagar",
    point: { lat: 12.9784, lng: 77.6408 },
  },
  {
    id: "fake-koramangala",
    name: "Koramangala 5th Block",
    address: "Koramangala 5th Block, Bengaluru",
    point: { lat: 12.9352, lng: 77.6245 },
  },
  {
    id: "fake-mg-road",
    name: "MG Road Metro",
    address: "Mahatma Gandhi Road, Bengaluru",
    point: { lat: 12.9756, lng: 77.6066 },
  },
  {
    id: "fake-airport-t1",
    name: "Kempegowda Airport — Terminal 1",
    address: "Kempegowda International Airport, Devanahalli",
    point: { lat: 13.1989, lng: 77.7068 },
  },
  {
    id: "fake-airport-t2",
    name: "Kempegowda Airport — Terminal 2",
    address: "Kempegowda International Airport, Devanahalli",
    point: { lat: 13.2006, lng: 77.7137 },
  },
  {
    id: "fake-whitefield",
    name: "Whitefield",
    address: "ITPL Main Road, Whitefield",
    point: { lat: 12.9698, lng: 77.75 },
  },
  {
    id: "fake-jayanagar",
    name: "Jayanagar 4th Block",
    address: "Jayanagar 4th Block, Bengaluru",
    point: { lat: 12.925, lng: 77.5838 },
  },
  {
    id: "fake-techpark",
    name: "Tech Park, Outer Ring Road",
    address: "Outer Ring Road, Bellandur",
    point: { lat: 12.9279, lng: 77.6851 },
  },
];

export function createFakeMaps(): MapsProvider {
  return {
    async route(from: LatLng, to: LatLng): Promise<Route | null> {
      if (haversineM(from, to) < 20) return null; // pickup and drop are the same place
      const corner: LatLng = { lat: from.lat, lng: to.lng };
      const { distanceM, durationS } = estimateRoad(from, to);
      return {
        distanceM,
        durationS,
        coordinates: [
          [from.lng, from.lat],
          [corner.lng, corner.lat],
          [to.lng, to.lat],
        ],
        isEstimate: false,
      };
    },

    async searchPlaces(query: string, near?: LatLng): Promise<Place[]> {
      const q = query.trim().toLowerCase();
      if (q.length < 3) return [];
      const matches = FAKE_PLACES.filter(
        (p) => p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q),
      );
      if (!near) return matches.slice(0, 5);
      return [...matches]
        .sort((a, b) => haversineM(near, a.point) - haversineM(near, b.point))
        .slice(0, 5);
    },
  };
}
