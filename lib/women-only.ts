/**
 * Women-only rules (docs/PRD.md F4, "9b · Women Pilots only" and
 * "8 · Women passengers only"). Pure and browser-safe.
 */

export type WomenOnlyMode = "off" | "always" | "night";
export type WomenOnlyFallback = "ask" | "wait";

/** "Night only" means 9 pm to 6 am in India. */
export const NIGHT_STARTS_HOUR = 21;
export const NIGHT_ENDS_HOUR = 6;

/**
 * With fallback "ask", how long a women-only request waits before the rider
 * is asked whether to match any Pilot: one offer wave.
 */
export const ASK_FALLBACK_AFTER_MS = 30_000;

export function isNightInIndia(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "Asia/Kolkata",
    }).format(now),
  );
  return hour >= NIGHT_STARTS_HOUR || hour < NIGHT_ENDS_HOUR;
}

/** Whether a mode applies right now. */
export function modeActive(mode: WomenOnlyMode, now: Date): boolean {
  return mode === "always" || (mode === "night" && isNightInIndia(now));
}
