"use client";

import { Banknote, CreditCard, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { VehicleIcon } from "@/components/icons/Vehicle";
import { Button } from "@/components/ui/button";
import { RIDE_TIERS, TIER_RATES, type RideTier } from "@/lib/fares";
import { formatRupees, type Paise } from "@/lib/money";
import { cn } from "@/lib/utils";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, type PaymentMethod } from "@/lib/wallet";

import { bookRideAction } from "../actions";

const METHOD_ICONS = { wallet: Wallet, upi: Smartphone, card: CreditCard, cash: Banknote };
const METHOD_NOTES: Record<PaymentMethod, string> = {
  wallet: "Paid automatically when the trip ends.",
  upi: "You'll pay with any UPI app when the trip ends (test mode).",
  card: "You'll pay by card when the trip ends (test mode).",
  cash: "Pay your Pilot at the drop. Short on change? It can go to your wallet.",
};

/**
 * The tier list, payment choice ("4b · Payment method") and Book button
 * on "4 · Choose ride". Prices and the balance come from the server; the
 * server checks the balance again when booking.
 */
export function RideOptions({
  quoteId,
  prices,
  balancePaise,
  returnPath,
  womenOnlyDefault,
}: {
  quoteId: string;
  prices: Record<RideTier, Paise>;
  balancePaise: Paise;
  returnPath: string;
  /** null when the rider isn't verified (the switch isn't offered). */
  womenOnlyDefault: boolean | null;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<RideTier>("go");
  const [method, setMethod] = useState<PaymentMethod>(
    balancePaise >= prices.go ? "wallet" : "cash",
  );
  const short = method === "wallet" && balancePaise < prices[tier];
  const [womenOnly, setWomenOnly] = useState(womenOnlyDefault ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function book() {
    setError(null);
    startTransition(async () => {
      const result = await bookRideAction({ quoteId, tier, paymentMethod: method, womenOnly });
      if (result.ok) {
        router.push("/ride/trip");
        return;
      }
      if (
        result.code === "CONFLICT" &&
        (result.message.includes("already have a ride") || result.message.includes("last ride"))
      ) {
        router.push("/ride/trip");
        return;
      }
      if (result.code === "CONFLICT") {
        // The 5-minute price hold ran out: fetch fresh prices in place.
        router.refresh();
      }
      setError(result.message);
    });
  }

  return (
    <>
      <div role="radiogroup" aria-label="Ride type" className="flex flex-col gap-1.5">
        {RIDE_TIERS.map((t) => {
          const selected = t === tier;
          return (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTier(t)}
              className={cn(
                "flex items-center gap-3.5 rounded-lg border-2 px-3 py-2.5 text-left",
                selected ? "border-primary bg-brand-soft" : "border-transparent",
              )}
            >
              <VehicleIcon tier={t} className="h-[34px] w-12 shrink-0" />
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-bold">{TIER_RATES[t].label}</span>
                <span className="text-[13px] text-muted-foreground">
                  {TIER_RATES[t].seats} {TIER_RATES[t].seats === 1 ? "seat" : "seats"}
                  {t === "prime" && " · top-rated Pilots"}
                  {t === "go" && " · AC"}
                </span>
              </span>
              <span className="font-heading text-[17px] font-bold" data-testid={`price-${t}`}>
                {formatRupees(prices[t])}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1.5">
        <div role="radiogroup" aria-label="Pay with" className="grid grid-cols-4 gap-1.5">
          {PAYMENT_METHODS.map((m) => {
            const Icon = METHOD_ICONS[m];
            const on = m === method;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setMethod(m)}
                className={cn(
                  "flex h-14 flex-col items-center justify-center gap-0.5 rounded-md border-2 text-xs font-semibold",
                  on ? "border-primary bg-brand-soft" : "border-border",
                )}
              >
                <Icon className="size-[18px] text-brand-text" aria-hidden />
                {m === "wallet" ? formatRupees(balancePaise) : PAYMENT_METHOD_LABELS[m]}
                <span className="sr-only">{m === "wallet" ? " in Comet Wallet" : ""}</span>
              </button>
            );
          })}
        </div>
        {short ? (
          <p className="text-[13px] font-semibold text-danger-text">
            Your wallet has {formatRupees(balancePaise)}.{" "}
            <Link
              href={`/ride/wallet?return=${encodeURIComponent(returnPath)}`}
              className="text-info underline"
            >
              Add {formatRupees(prices[tier] - balancePaise)} or more
            </Link>{" "}
            or choose another way to pay.
          </p>
        ) : (
          <p className="text-[13px] text-muted-foreground">{METHOD_NOTES[method]}</p>
        )}
      </div>

      {womenOnlyDefault !== null && (
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2.5">
          <ShieldCheck className="size-[18px] shrink-0 text-info" aria-hidden />
          <span className="flex flex-1 flex-col">
            <span className="text-sm font-bold">Women Pilots only</span>
            <span className="text-xs text-muted-foreground">
              Matched only with verified women Pilots
            </span>
          </span>
          <input
            type="checkbox"
            role="switch"
            checked={womenOnly}
            onChange={(e) => setWomenOnly(e.target.checked)}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className="relative h-7 w-12 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-5"
          />
        </label>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button
        onClick={book}
        disabled={pending || short}
        className="h-14 rounded-lg text-[17px] font-bold"
      >
        {pending ? "Booking…" : `Book ${TIER_RATES[tier].label}`}
      </Button>
    </>
  );
}
