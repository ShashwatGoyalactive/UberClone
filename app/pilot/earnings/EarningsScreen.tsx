"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { TIER_RATES } from "@/lib/fares";
import { formatRupees } from "@/lib/money";
import type { EarningsView } from "@/lib/services/earnings";
import { cn } from "@/lib/utils";

import { requestPayoutAction } from "../actions";

const dayName = new Intl.DateTimeFormat("en-IN", { weekday: "short", timeZone: "UTC" });
const dayFull = new Intl.DateTimeFormat("en-IN", {
  weekday: "long",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const when = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});
// "2026-10-11" read as a UTC midnight so the weekday never shifts with the viewer's zone.
const asDate = (d: string) => new Date(`${d}T00:00:00Z`);

/** "6 · Earnings & payout" on the canvas. */
export function EarningsScreen({ initial, cometId }: { initial: EarningsView; cometId: string }) {
  const [data, setData] = useState(initial);
  const [selected, setSelected] = useState(initial.days.length - 1);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const max = Math.max(...data.days.map((d) => d.earnedPaise), 1);
  const day = data.days[selected]!;
  const balance = data.wallet.balancePaise;

  function withdraw() {
    setMessage(null);
    startTransition(async () => {
      const result = await requestPayoutAction({
        amountPaise: balance,
        requestId: crypto.randomUUID(),
      });
      if (!result.ok) {
        setMessage({ kind: "error", text: result.message });
        return;
      }
      setData({ ...data, wallet: { ...data.wallet, balancePaise: result.data.balancePaise } });
      setMessage({
        kind: "ok",
        text: `${formatRupees(balance)} is on its way to your bank. (Simulated — no real money moves.)`,
      });
    });
  }

  return (
    <main className="flex min-h-dvh flex-col md:grid md:min-h-0 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-start md:gap-6">
      <div className="flex flex-col">
        <div className="flex items-center gap-3 px-5 pt-6 md:px-0 md:pt-0">
          <Link
            href="/pilot"
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-full bg-card"
          >
            <ArrowLeft className="size-[22px]" aria-hidden strokeWidth={2.2} />
          </Link>
          <h1 className="flex-1 font-heading text-[22px] font-bold tracking-tight">Earnings</h1>
          <span className="rounded-full bg-card px-3 py-1.5 text-sm font-semibold">
            Last 7 days
          </span>
        </div>

        <section className="mx-5 mt-4 flex flex-col gap-4 rounded-xl bg-card p-5 md:mx-0">
          <div className="flex items-end justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] text-muted-foreground">
                {dayFull.format(asDate(day.date))}
                {day.trips === 0
                  ? " · no trips"
                  : ` · ${day.trips} ${day.trips === 1 ? "trip" : "trips"}`}
              </span>
              <span
                className="font-heading text-[34px] leading-tight font-bold tracking-tight"
                data-testid="day-earnings"
              >
                {formatRupees(day.earnedPaise)}
              </span>
            </div>
            <span className="text-[13px] text-muted-foreground" data-testid="week-earnings">
              Week {formatRupees(data.weekPaise)}
            </span>
          </div>
          <div
            className="grid h-[150px] grid-cols-7 items-end gap-2.5"
            role="group"
            aria-label="Earnings by day"
          >
            {data.days.map((d, i) => (
              <button
                key={d.date}
                type="button"
                onClick={() => setSelected(i)}
                aria-pressed={i === selected}
                aria-label={`${dayFull.format(asDate(d.date))}: ${formatRupees(d.earnedPaise)}`}
                className="flex h-full flex-col items-center justify-end gap-1.5"
              >
                <span
                  className={cn("w-full rounded-sm", i === selected ? "bg-primary" : "bg-border")}
                  style={{ height: `${Math.max(6, Math.round((d.earnedPaise / max) * 124))}px` }}
                />
                <span
                  className={cn(
                    "text-xs font-semibold",
                    i === selected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {dayName.format(asDate(d.date))}
                </span>
              </button>
            ))}
          </div>
        </section>

        <div className="mx-5 mt-3 grid grid-cols-2 gap-2 md:mx-0">
          <div className="flex flex-col gap-0.5 rounded-lg bg-card px-3 py-3">
            <span className="font-heading text-[17px] font-bold">{data.weekTrips}</span>
            <span className="text-xs text-muted-foreground">Trips this week</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-lg bg-card px-3 py-3">
            <span className="font-heading text-[17px] font-bold">
              {data.rating ? data.rating.toFixed(2) : "New"}
            </span>
            <span className="text-xs text-muted-foreground">Rating</span>
          </div>
        </div>

        <section className="mx-5 mt-3 flex items-center gap-3.5 rounded-xl bg-ink p-[18px] text-on-ink md:mx-0">
          <div className="flex flex-1 flex-col gap-0.5">
            <span className="text-[13px] text-ink-muted">Pilot wallet</span>
            <span className="font-heading text-2xl font-bold" data-testid="pilot-balance">
              {formatRupees(balance)}
            </span>
            <span className="text-xs text-ink-muted">Comet ID · {cometId}</span>
          </div>
          <Button
            onClick={withdraw}
            disabled={pending || balance <= 0}
            className="h-12 rounded-lg px-[18px] text-[15px] font-bold"
          >
            {pending ? "Sending…" : "Withdraw"}
          </Button>
        </section>
        {balance < 0 && (
          <p className="mx-5 mt-2 text-[13px] text-muted-foreground">
            You owe Comet its fee on cash trips. It&apos;s settled from your next online payments.
          </p>
        )}
        {message && (
          <p
            role={message.kind === "error" ? "alert" : "status"}
            className={cn(
              "mx-5 mt-3 rounded-md px-4 py-3 text-sm font-semibold",
              message.kind === "error"
                ? "bg-danger-soft text-danger-text"
                : "bg-info-soft text-info",
            )}
          >
            {message.text}
          </p>
        )}
      </div>
      <section className="mt-4 flex flex-1 flex-col rounded-t-[var(--radius-sheet)] bg-card px-5 pt-4 pb-6 md:mt-0 md:rounded-3xl">
        <h2 className="mb-1 font-heading text-[17px] font-bold">Recent trips</h2>
        {data.recentTrips.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No trips yet. Go online to get requests.
          </p>
        ) : (
          <ul aria-label="Recent trips">
            {data.recentTrips.map((t) => (
              <li key={t.id} className="flex items-center gap-3 border-b border-border py-3">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">
                    {t.pickup} → {t.drop}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    {when.format(new Date(t.completedAt))} · {TIER_RATES[t.tier].label}
                    {t.paymentStatus !== "paid" && " · awaiting payment"}
                  </span>
                </span>
                <span className="font-heading text-[15px] font-bold">
                  {formatRupees(t.earnedPaise)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
