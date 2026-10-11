import { roundToRupee, rupees, type Paise } from "@/lib/money";

/**
 * Fare rules. Pure, browser-safe, and the single place prices are defined
 * (docs/PRD.md §6 F3 and the fare table there). The server computes every
 * fare a rider sees or pays; the browser only displays them.
 *
 * A fare is: base + distance × per-km + time × per-minute, multiplied by
 * surge, rounded to the rupee, and never below the tier's minimum.
 * Discounts, waiting fees and cancellation fees are applied after this,
 * by the services that own them.
 */

export const RIDE_TIERS = ["bike", "auto", "go", "prime"] as const;
export type RideTier = (typeof RIDE_TIERS)[number];

export type TierRates = {
  label: string;
  seats: number;
  base: Paise;
  perKm: Paise;
  perMinute: Paise;
  minimum: Paise;
};

export const TIER_RATES: Record<RideTier, TierRates> = {
  bike: {
    label: "Comet Bike",
    seats: 1,
    base: rupees(20),
    perKm: rupees(6),
    perMinute: rupees(1),
    minimum: rupees(30),
  },
  auto: {
    label: "Comet Auto",
    seats: 3,
    base: rupees(30),
    perKm: rupees(9),
    perMinute: rupees(1.5),
    minimum: rupees(45),
  },
  go: {
    label: "Comet Go",
    seats: 4,
    base: rupees(50),
    perKm: rupees(12),
    perMinute: rupees(2),
    minimum: rupees(80),
  },
  prime: {
    label: "Comet Prime",
    seats: 4,
    base: rupees(80),
    perKm: rupees(17),
    perMinute: rupees(3),
    minimum: rupees(120),
  },
};

/** Surge never exceeds 2×; anything outside [1, 2] is clamped. */
export const MAX_SURGE = 2;

/** Comet keeps 15% of the fare; tips and cancellation fees go 100% to the Pilot. */
export const PLATFORM_FEE_BASIS_POINTS = 1500;

export type FareInput = {
  distanceM: number;
  durationS: number;
  surge?: number;
};

export type FareBreakdown = {
  tier: RideTier;
  base: Paise;
  distance: Paise;
  time: Paise;
  surge: number;
  /** Before the minimum is applied. */
  subtotal: Paise;
  total: Paise;
};

export function clampSurge(surge: number | undefined): number {
  if (surge === undefined || !Number.isFinite(surge)) return 1;
  return Math.min(MAX_SURGE, Math.max(1, Math.round(surge * 100) / 100));
}

export function quoteTier(tier: RideTier, input: FareInput): FareBreakdown {
  if (input.distanceM < 0 || input.durationS < 0) {
    throw new RangeError("Distance and duration can't be negative.");
  }
  const rates = TIER_RATES[tier];
  const surge = clampSurge(input.surge);
  const distance = Math.round((input.distanceM / 1000) * rates.perKm);
  const time = Math.round((input.durationS / 60) * rates.perMinute);
  const subtotal = roundToRupee(Math.round((rates.base + distance + time) * surge));
  return {
    tier,
    base: rates.base,
    distance,
    time,
    surge,
    subtotal,
    total: Math.max(subtotal, rates.minimum),
  };
}

/** All four tiers at once, as shown on "4 · Choose ride". */
export function quoteAllTiers(input: FareInput): Record<RideTier, FareBreakdown> {
  return Object.fromEntries(RIDE_TIERS.map((t) => [t, quoteTier(t, input)])) as Record<
    RideTier,
    FareBreakdown
  >;
}

/**
 * How a completed fare is split. The platform fee is rounded down to the
 * paisa so rounding always favours the Pilot.
 */
export function splitFare(farePaise: Paise, tipPaise: Paise = 0) {
  const platformFee = Math.floor((farePaise * PLATFORM_FEE_BASIS_POINTS) / 10_000);
  return {
    platformFee,
    pilotEarning: farePaise - platformFee + tipPaise,
  };
}
