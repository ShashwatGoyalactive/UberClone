import { rupees, type Paise } from "@/lib/money";

/**
 * Rating and tipping rules (docs/PRD.md F7), shared by the screens and the
 * server. Pure and browser-safe.
 */

/** What a rider can say about their Pilot ("7 · Trip done & rating"). */
export const PILOT_TAGS = [
  "Smooth driving",
  "On time",
  "Clean car",
  "Friendly",
  "Knew the route",
] as const;

/** What a Pilot can say about their rider. */
export const RIDER_TAGS = ["Polite", "Ready at pickup", "Clear directions", "Respectful"] as const;

export const TIP_PRESETS: Paise[] = [rupees(10), rupees(20), rupees(50)];
/** The largest tip, so a slip of the thumb can't empty a wallet. */
export const MAX_TIP: Paise = rupees(500);

export const MAX_COMMENT = 500;

/** "★★★★☆" for receipts and lists. */
export function starString(stars: number): string {
  const n = Math.max(0, Math.min(5, Math.round(stars)));
  return "★".repeat(n) + "☆".repeat(5 - n);
}
