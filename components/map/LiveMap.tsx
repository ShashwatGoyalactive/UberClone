"use client";

import dynamic from "next/dynamic";

import { FallbackMap } from "./FallbackMap";
import type { MapViewProps } from "./types";

/**
 * The map every rider and Pilot screen uses. Real Mapbox when a public
 * token is configured, loaded lazily on the client; otherwise the drawn
 * fallback, which also shows while Mapbox loads.
 */
const MapboxMap = dynamic(() => import("./MapboxMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[var(--map-land)]" />,
});

const hasToken = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

export function LiveMap(props: MapViewProps) {
  return hasToken ? <MapboxMap {...props} /> : <FallbackMap {...props} />;
}
