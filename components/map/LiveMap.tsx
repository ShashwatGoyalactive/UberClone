"use client";

import dynamic from "next/dynamic";

import { DESKTOP_PANEL_INSET_PX } from "@/components/layout/panel";
import { useIsDesktop } from "@/lib/use-is-desktop";

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

/**
 * On desktop, a screen whose sheet covers the bottom of the map on phones
 * shows it as a panel on the left instead, so the map is framed beside it.
 */
export function LiveMap(props: MapViewProps) {
  const desktop = useIsDesktop();
  const framed =
    desktop && (props.bottomInset ?? 0) > 0
      ? { ...props, bottomInset: 0, leftInset: DESKTOP_PANEL_INSET_PX }
      : props;
  return hasToken ? <MapboxMap {...framed} /> : <FallbackMap {...framed} />;
}
