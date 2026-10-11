/**
 * Money is integer paise everywhere (docs/ARCHITECTURE.md §9). These are
 * the only conversions to and from what people read. Pure and
 * browser-safe.
 */

export type Paise = number;

const inr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const inrExact = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "₹1,240" — whole rupees, Indian digit grouping. For fares and prices. */
export function formatRupees(paise: Paise): string {
  assertPaise(paise);
  const sign = paise < 0 ? "−" : "";
  return `${sign}₹${inr.format(Math.round(Math.abs(paise) / 100))}`;
}

/** "₹1,240.00" — exact. For wallet balances and receipts. */
export function formatRupeesExact(paise: Paise): string {
  assertPaise(paise);
  const sign = paise < 0 ? "−" : "";
  return `${sign}₹${inrExact.format(Math.abs(paise) / 100)}`;
}

/** Whole rupees to paise, for constants written in rupees. */
export function rupees(amount: number): Paise {
  return Math.round(amount * 100);
}

/** Rounds to the nearest whole rupee; fares are always charged in rupees. */
export function roundToRupee(paise: Paise): Paise {
  return Math.round(paise / 100) * 100;
}

export function assertPaise(value: number): asserts value is Paise {
  if (!Number.isSafeInteger(value)) throw new TypeError(`Not an integer paise amount: ${value}`);
}
