"use client";

import { useSyncExternalStore } from "react";

/**
 * True from 768px wide (docs/DESIGN_SYSTEM.md §14 breakpoints), where map
 * screens show their panel on the left instead of as a bottom sheet.
 * False during server rendering; the phone layout is the default.
 */
const QUERY = "(min-width: 768px)";

function subscribe(onChange: () => void) {
  const mql = window.matchMedia(QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
