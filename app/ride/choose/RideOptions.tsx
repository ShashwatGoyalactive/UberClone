"use client";

import { useState } from "react";

import { VehicleIcon } from "@/components/icons/Vehicle";
import { Button } from "@/components/ui/button";
import { RIDE_TIERS, TIER_RATES, type RideTier } from "@/lib/fares";
import { formatRupees, type Paise } from "@/lib/money";
import { cn } from "@/lib/utils";

/** The tier list and Book button on "4 · Choose ride". Prices come from the server's quote. */
export function RideOptions({ prices }: { prices: Record<RideTier, Paise> }) {
  const [tier, setTier] = useState<RideTier>("go");

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

      <Button disabled className="h-14 rounded-lg text-[17px] font-bold">
        Book {TIER_RATES[tier].label}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Booking opens in the next build phase. Prices are held for 5 minutes.
      </p>
    </>
  );
}
