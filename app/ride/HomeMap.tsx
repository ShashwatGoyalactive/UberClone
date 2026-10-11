"use client";

import { LiveMap } from "@/components/map/LiveMap";
import { useCurrentPosition } from "@/lib/use-current-position";

/** The full-bleed map behind the rider home sheet, centred on the rider. */
export function HomeMap() {
  const { position } = useCurrentPosition();
  return <LiveMap center={position} you={position} bottomInset={0.55} />;
}
