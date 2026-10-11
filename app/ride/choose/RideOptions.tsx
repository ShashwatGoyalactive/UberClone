"use client";

import { Banknote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { VehicleIcon } from "@/components/icons/Vehicle";
import { Button } from "@/components/ui/button";
import { RIDE_TIERS, TIER_RATES, type RideTier } from "@/lib/fares";
import { formatRupees, type Paise } from "@/lib/money";
import { cn } from "@/lib/utils";

import { bookRideAction } from "../actions";

/** The tier list and Book button on "4 · Choose ride". Prices come from the server's quote. */
export function RideOptions({
  quoteId,
  prices,
}: {
  quoteId: string;
  prices: Record<RideTier, Paise>;
}) {
  const router = useRouter();
  const [tier, setTier] = useState<RideTier>("go");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function book() {
    setError(null);
    startTransition(async () => {
      const result = await bookRideAction({ quoteId, tier, paymentMethod: "cash" });
      if (result.ok) {
        router.push("/ride/trip");
        return;
      }
      if (result.code === "CONFLICT" && result.message.includes("already have a ride")) {
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

      <div className="flex h-12 items-center gap-2 rounded-md border border-border px-3 text-sm font-semibold">
        <Banknote className="size-[18px] text-brand-text" aria-hidden />
        Pay with cash
        <span className="ml-auto text-xs font-medium text-muted-foreground">
          Wallet &amp; UPI coming soon
        </span>
      </div>

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button onClick={book} disabled={pending} className="h-14 rounded-lg text-[17px] font-bold">
        {pending ? "Booking…" : `Book ${TIER_RATES[tier].label}`}
      </Button>
    </>
  );
}
