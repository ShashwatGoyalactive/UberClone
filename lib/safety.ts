/**
 * Safety rules shared by the screens and the server (docs/PRD.md F9,
 * docs/SECURITY.md §9). Pure and browser-safe.
 */

/** The cancellable countdown before an SOS is sent. */
export const SOS_COUNTDOWN_S = 3;

/** Why a Pilot raised SOS ("5d · Pilot SOS"). Optional; never required to send. */
export const PILOT_SOS_REASONS = [
  { id: "rider_unsafe", label: "Rider is unsafe", tag: "RIDER ISSUE" },
  { id: "accident", label: "Accident", tag: "ACCIDENT" },
  { id: "medical", label: "Medical help", tag: "MEDICAL" },
  { id: "vehicle", label: "Vehicle problem", tag: "VEHICLE" },
] as const;

export const SOS_REASON_IDS = ["rider_unsafe", "accident", "medical", "vehicle", "other"] as const;
export type SosReasonId = (typeof SOS_REASON_IDS)[number];

export const PIN_PATTERN = /^\d{4}$/;

/**
 * Demo accounts get this PIN so a visitor can end a test SOS; the SOS
 * screen tells them what it is. Real accounts choose their own.
 */
export const DEMO_SAFETY_PIN = "1234";

/** A shared trip link keeps working this long after the trip ends. */
export const SHARE_GRACE_AFTER_END_S = 60 * 60;
/** And never longer than this after it was made. */
export const SHARE_MAX_LIFETIME_S = 12 * 60 * 60;

/**
 * The area of an address, never the exact place (docs/SECURITY.md §6):
 * "27th Main Road, HSR Layout, Bengaluru" → "HSR Layout". A one-part name
 * ("MG Road Metro") is already a landmark, not a door number.
 */
export function areaOf(address: string): string {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  return (parts.length >= 2 ? parts[1] : parts[0]) ?? "";
}

/** "Rohan Kumar" → "Rohan K." — what a shared trip shows of the Pilot. */
export function firstNameLastInitial(name: string): string {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? "");
}
