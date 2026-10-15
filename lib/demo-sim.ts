import { lineLengthM, pointAlong, type LatLng } from "@/lib/geo";

/**
 * The simulated Pilot's script for a demo ride (docs/ARCHITECTURE.md §9).
 * Pure: everything is a function of the seconds since the ride was
 * requested, so a missed, late or duplicated tick can't put the ride in
 * the wrong place — the next tick computes the same answer.
 *
 * Compressed so a visitor finishes a whole ride in under two minutes
 * (docs/PRD.md §3). A real Pilot who accepts first simply wins the race;
 * the bot only steps in if the ride is still waiting at ACCEPT_AT.
 */

export const SIM = {
  /** The bot accepts if nobody else has. */
  ACCEPT_AT_S: 6,
  /** Driving to the pickup. */
  APPROACH_S: 30,
  /** Waiting at the pickup before "entering" the ride code. */
  WAIT_S: 6,
  /** The trip itself, however long the real route is. */
  TRIP_S: 45,
  /** How far away the bot starts, in metres. */
  START_DISTANCE_M: 1_200,
} as const;

export type SimPhase = "searching" | "approaching" | "waiting" | "on_trip" | "done";

export type SimStep = {
  phase: SimPhase;
  /** 0–1 progress through the current leg. */
  progress: number;
};

export function simStep(elapsedS: number): SimStep {
  const arriveAt = SIM.ACCEPT_AT_S + SIM.APPROACH_S;
  const startAt = arriveAt + SIM.WAIT_S;
  const endAt = startAt + SIM.TRIP_S;
  if (elapsedS < SIM.ACCEPT_AT_S)
    return { phase: "searching", progress: elapsedS / SIM.ACCEPT_AT_S };
  if (elapsedS < arriveAt)
    return { phase: "approaching", progress: (elapsedS - SIM.ACCEPT_AT_S) / SIM.APPROACH_S };
  if (elapsedS < startAt) return { phase: "waiting", progress: (elapsedS - arriveAt) / SIM.WAIT_S };
  if (elapsedS < endAt) return { phase: "on_trip", progress: (elapsedS - startAt) / SIM.TRIP_S };
  return { phase: "done", progress: 1 };
}

/** Seconds from request until the simulated trip completes. */
export const SIM_TOTAL_S = SIM.ACCEPT_AT_S + SIM.APPROACH_S + SIM.WAIT_S + SIM.TRIP_S;

/**
 * For a cash ride, how long after the drop the bot taps "Cash received"
 * (the exact fare, no change) — long enough for the rider to see the
 * "pay your Pilot" screen.
 */
export const SIM_CASH_CONFIRM_S = 6;

/**
 * Where the bot starts: START_DISTANCE_M away from the pickup, offset
 * diagonally so its approach reads as a drive, not a teleport.
 */
export function simStartPoint(pickup: LatLng): LatLng {
  const d = SIM.START_DISTANCE_M / Math.SQRT2;
  return {
    lat: pickup.lat - d / 111_320,
    lng: pickup.lng - d / (111_320 * Math.cos((pickup.lat * Math.PI) / 180)),
  };
}

/** An L-shaped approach path from the start point to the pickup. */
export function simApproachPath(pickup: LatLng): LatLng[] {
  const start = simStartPoint(pickup);
  return [start, { lat: start.lat, lng: pickup.lng }, pickup];
}

/** The bot's position and heading at a given moment of the script. */
export function simPosition(
  step: SimStep,
  pickup: LatLng,
  route: [number, number][],
): { point: LatLng; headingDeg: number } {
  const tripLine = route.map(([lng, lat]) => ({ lat, lng }));
  switch (step.phase) {
    case "searching":
      return pointAlong(simApproachPath(pickup), 0);
    case "approaching": {
      const path = simApproachPath(pickup);
      return pointAlong(path, lineLengthM(path) * step.progress);
    }
    case "waiting":
      return pointAlong(simApproachPath(pickup), Number.POSITIVE_INFINITY);
    case "on_trip":
      return pointAlong(tripLine, lineLengthM(tripLine) * step.progress);
    case "done":
      return pointAlong(tripLine, Number.POSITIVE_INFINITY);
  }
}

/** The simulated Pilot's name on a women-only demo ride. */
export const SIM_WOMAN_PILOT = "Priya Sharma";

/** A plausible vehicle for each tier, so the bot's card matches the ride booked. */
export const SIM_VEHICLES = {
  bike: {
    vehicleType: "bike",
    vehicleModel: "Honda Activa",
    vehicleColour: "Grey",
    plate: "KA 03 HX 4417",
    seats: 1,
  },
  auto: {
    vehicleType: "auto",
    vehicleModel: "Bajaj RE Auto",
    vehicleColour: "Green-yellow",
    plate: "KA 01 AB 3392",
    seats: 3,
  },
  go: {
    vehicleType: "car",
    vehicleModel: "Maruti Swift Dzire",
    vehicleColour: "White",
    plate: "KA 05 MX 2841",
    seats: 4,
  },
  prime: {
    vehicleType: "car",
    vehicleModel: "Toyota Camry",
    vehicleColour: "Black",
    plate: "KA 51 PR 7006",
    seats: 4,
  },
} as const;
