"use client";

import { Star } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { formatRupees, rupees } from "@/lib/money";
import { MAX_TIP, PILOT_TAGS, RIDER_TAGS, TIP_PRESETS } from "@/lib/ratings";
import { cn } from "@/lib/utils";

import { rateRideAction } from "@/app/ride/actions";

/**
 * Stars, tags and (for riders) a tip — the rating half of "7 · Trip done
 * & rating". The server checks everything again; a tip comes from the
 * rider's wallet and goes entirely to the Pilot.
 */
export function RatingForm({
  rideId,
  rateeName,
  side,
  onRated,
}: {
  rideId: string;
  rateeName: string;
  side: "rider" | "pilot";
  onRated: (stars: number) => void;
}) {
  const [stars, setStars] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [tip, setTip] = useState<number | "other">(0);
  const [otherTip, setOtherTip] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const tagList: readonly string[] = side === "rider" ? PILOT_TAGS : RIDER_TAGS;
  const first = rateeName.split(" ")[0];

  const tipPaise = tip === "other" ? rupees(Number(otherTip) || 0) : tip;
  const tipValid = tipPaise >= 0 && tipPaise <= MAX_TIP;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await rateRideAction({ rideId, stars, tags, tipPaise });
      if (result.ok) onRated(stars);
      else setError(result.message);
    });
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="rate-heading">
      <div className="flex flex-col gap-0.5">
        <h2 id="rate-heading" className="text-base font-bold">
          How was your ride with {first}?
        </h2>
        <span className="text-[13px] text-muted-foreground">Your rating is anonymous</span>
      </div>

      <div role="radiogroup" aria-label="Rating" className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={stars === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setStars(n)}
            className="flex size-[52px] items-center justify-center rounded-md"
          >
            <Star
              className={cn(
                "size-10",
                n <= stars ? "fill-[#F5A524] text-[#F5A524]" : "fill-muted text-muted",
              )}
              strokeWidth={1.5}
              aria-hidden
            />
          </button>
        ))}
      </div>

      {stars > 0 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="What went well">
          {tagList.map((tag) => {
            const on = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                aria-pressed={on}
                onClick={() => setTags(on ? tags.filter((t) => t !== tag) : [...tags, tag])}
                className={cn(
                  "rounded-full px-3.5 py-2 text-sm font-semibold",
                  on ? "bg-ink text-on-ink" : "border border-border",
                )}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}

      {side === "rider" && stars > 0 && (
        <div className="flex flex-col gap-2">
          <span id="tip-label" className="text-sm font-semibold">
            Add a tip for {first}{" "}
            <span className="font-normal text-muted-foreground">· from your wallet</span>
          </span>
          <div role="radiogroup" aria-labelledby="tip-label" className="grid grid-cols-4 gap-2">
            {[0, ...TIP_PRESETS].map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={tip === value}
                onClick={() => setTip(value)}
                className={cn(
                  "h-11 rounded-md border-2 text-[15px] font-bold",
                  tip === value ? "border-primary bg-brand-soft" : "border-border",
                )}
              >
                {value === 0 ? "No tip" : formatRupees(value)}
              </button>
            ))}
          </div>
          <label className="flex h-11 items-center gap-2 rounded-md border border-border px-3 text-sm focus-within:border-primary">
            <span className="text-muted-foreground">Other ₹</span>
            <input
              inputMode="numeric"
              aria-label="Other tip in rupees"
              value={otherTip}
              onFocus={() => setTip("other")}
              onChange={(e) => {
                setTip("other");
                setOtherTip(e.target.value.replace(/[^\d]/g, "").slice(0, 3));
              }}
              className="flex-1 bg-transparent outline-none"
            />
          </label>
          {!tipValid && (
            <span className="text-[13px] font-semibold text-danger-text">
              Tips go up to {formatRupees(MAX_TIP)}.
            </span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-semibold text-danger-text">
          {error}
        </p>
      )}
      <Button
        onClick={submit}
        disabled={pending || stars === 0 || !tipValid}
        className="h-14 rounded-lg text-[17px] font-bold"
      >
        {pending
          ? "Sending…"
          : tipPaise > 0
            ? `Submit & tip ${formatRupees(tipPaise)}`
            : "Submit rating"}
      </Button>
    </section>
  );
}
