import "server-only";

import { appEnv } from "@/lib/env";
import { log } from "@/lib/log";

import { createFakeMaps } from "./fake";
import { createMapboxMaps } from "./real";
import type { MapsProvider } from "./types";

/**
 * Which maps provider this process uses.
 *
 * - COMET_FAKE_EXTERNALS=1 → the deterministic fake (tests, CI).
 * - A Mapbox secret token → real Mapbox.
 * - No token in dev → the fake, with a warning, so the app works before
 *   Mapbox is set up.
 * - No token anywhere else → an error: qa, stage and prod must never
 *   quietly show made-up routes.
 */
let provider: MapsProvider | undefined;

export function maps(): MapsProvider {
  if (provider) return provider;
  const token = process.env.MAPBOX_SECRET_TOKEN;
  if (process.env.COMET_FAKE_EXTERNALS === "1") {
    provider = createFakeMaps();
  } else if (token) {
    provider = createMapboxMaps(token);
  } else if (appEnv() === "dev") {
    log.warn("mapbox.using_fake", { reason: "MAPBOX_SECRET_TOKEN not set" });
    provider = createFakeMaps();
  } else {
    throw new Error("MAPBOX_SECRET_TOKEN is not set. Routes and search need it outside dev.");
  }
  return provider;
}
