"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

import type { MapViewProps } from "./types";

/**
 * A drawn stand-in for the Mapbox map, used when no public token is
 * configured (development before Mapbox is set up) and if Mapbox fails to
 * load. It projects the real route and markers into the view, so screens
 * are fully usable and testable without a map provider; the streets
 * behind them are decorative.
 */

/** The decorative streets are drawn for a phone screen this size. */
const BASE_W = 390;
const BASE_H = 844;

export function FallbackMap({
  center,
  you,
  pickup,
  drop,
  car,
  route,
  bottomInset = 0,
  className,
}: MapViewProps) {
  // Markers are fitted to the box the map is actually drawn in, so a short
  // map (a receipt header, the shared-trip page) still shows them.
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: BASE_W, h: BASE_H });
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry!.contentRect;
      if (width > 0 && height > 0) setSize({ w: Math.round(width), h: Math.round(height) });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const W = size.w;
  const H = size.h;

  const pts: [number, number][] = [
    ...(route ?? []),
    ...[you, pickup, drop, car, center]
      .filter(Boolean)
      .map((p) => [p!.lng, p!.lat] as [number, number]),
  ];

  // Fit everything into the part of the map above the sheet.
  const visibleH = H * (1 - bottomInset);
  const lngs = pts.map((p) => p[0]);
  const lats = pts.map((p) => p[1]);
  const pad = 0.004;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  // Room for the floating controls at the top and the markers' size.
  const padY = Math.min(160, visibleH * 0.35);
  const shiftY = Math.min(40, visibleH * 0.08);
  const scale = Math.min((W - 80) / (maxLng - minLng), (visibleH - padY) / (maxLat - minLat));
  const cx = (minLng + maxLng) / 2;
  const cy = (minLat + maxLat) / 2;
  const project = ([lng, lat]: [number, number]) =>
    [W / 2 + (lng - cx) * scale, visibleH / 2 + shiftY - (lat - cy) * scale] as const;
  // Scale the street drawing to cover the box, centred.
  const cover = Math.max(W / BASE_W, H / BASE_H);
  const streets = `translate(${(W - BASE_W * cover) / 2} ${(H - BASE_H * cover) / 2}) scale(${cover})`;

  const routePath =
    route && route.length > 1
      ? route.map((p, i) => `${i === 0 ? "M" : "L"}${project(p).join(" ")}`).join(" ")
      : null;
  const at = (p?: { lat: number; lng: number }) => (p ? project([p.lng, p.lat]) : null);
  const youXY = at(you);
  const pickupXY = at(pickup);
  const dropXY = at(drop);
  const carXY = at(car);

  return (
    <div
      ref={box}
      className={cn("relative h-full w-full overflow-hidden bg-[var(--map-land)]", className)}
      role="img"
      aria-label="Map"
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <g transform={streets}>
          <path d="M-10 690 C 60 668 132 728 122 860 L -10 860 Z" fill="var(--map-water)" />
          <rect x="188" y="350" width="98" height="96" rx="14" fill="var(--map-park)" />
          <g stroke="var(--map-road)" strokeWidth="7" strokeLinecap="round" fill="none">
            {[40, 232, 362].map((x) => (
              <path key={`v${x}`} d={`M${x} -10 L${x} 860`} />
            ))}
            {[84, 160, 222, 400, 478, 720, 800].map((y) => (
              <path key={`h${y}`} d={`M-10 ${y} L400 ${y}`} />
            ))}
          </g>
          <g fill="none" strokeLinecap="round">
            <path
              d="M-10 300 C 120 280 260 330 400 296"
              stroke="var(--map-major)"
              strokeWidth="12"
            />
            <path d="M150 -10 L172 860" stroke="var(--map-major)" strokeWidth="12" />
          </g>
        </g>

        {routePath && (
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={routePath} stroke="var(--map-route-halo)" strokeWidth="12" />
            <path d={routePath} stroke="var(--primary)" strokeWidth="5" data-testid="route-line" />
          </g>
        )}
        {dropXY && (
          <rect
            x={dropXY[0] - 10}
            y={dropXY[1] - 10}
            width="20"
            height="20"
            rx="4"
            fill="var(--ink)"
            stroke="#fff"
            strokeWidth="3"
          />
        )}
        {pickupXY && (
          <circle
            cx={pickupXY[0]}
            cy={pickupXY[1]}
            r="9"
            fill="#fff"
            stroke="var(--ink)"
            strokeWidth="5"
          />
        )}
        {carXY && (
          <g transform={`translate(${carXY[0]} ${carXY[1]})`} data-testid="car-marker">
            <circle r="22" fill="var(--primary)" opacity="0.22" />
            <rect
              x="-9"
              y="-15"
              width="18"
              height="30"
              rx="6"
              fill="var(--primary)"
              stroke="#fff"
              strokeWidth="2.5"
            />
          </g>
        )}
        {youXY && !pickupXY && (
          <g>
            <circle
              cx={youXY[0]}
              cy={youXY[1]}
              r="26"
              fill="var(--info)"
              opacity="0.14"
              className="motion-safe:animate-pulse"
            />
            <circle
              cx={youXY[0]}
              cy={youXY[1]}
              r="10"
              fill="var(--info)"
              stroke="#fff"
              strokeWidth="4"
            />
          </g>
        )}
      </svg>
    </div>
  );
}
