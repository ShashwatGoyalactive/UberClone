import { rupees, type Paise } from "@/lib/money";

/**
 * Waiting and no-show rules (docs/PRD.md F5). Pure.
 *
 * Free waiting for 3 minutes after the Pilot arrives, then ₹2 a minute
 * (each started minute counts) until the trip starts. After 5 minutes the
 * Pilot may cancel as a no-show, and the rider is charged ₹40 — paid to
 * the Pilot for the trip to the pickup.
 */

export const FREE_WAIT_S = 3 * 60;
export const WAIT_FEE_PER_MINUTE: Paise = rupees(2);
export const NO_SHOW_AFTER_S = 5 * 60;
export const NO_SHOW_FEE: Paise = rupees(40);
/** Wrong ride codes allowed before the Pilot must call support. */
export const MAX_RIDE_CODE_ATTEMPTS = 5;

export function waitingFee(arrivedAt: Date, startedAt: Date): Paise {
  const waitedS = (startedAt.getTime() - arrivedAt.getTime()) / 1000;
  if (waitedS <= FREE_WAIT_S) return 0;
  return Math.ceil((waitedS - FREE_WAIT_S) / 60) * WAIT_FEE_PER_MINUTE;
}

export function canCancelAsNoShow(arrivedAt: Date, now: Date): boolean {
  return (now.getTime() - arrivedAt.getTime()) / 1000 >= NO_SHOW_AFTER_S;
}
