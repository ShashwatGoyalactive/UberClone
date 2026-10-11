"use client";

import { Check, Phone, ShieldAlert, Star } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { LiveMap } from "@/components/map/LiveMap";
import { Button } from "@/components/ui/button";
import { TIER_RATES } from "@/lib/fares";
import { formatRupees } from "@/lib/money";
import { topics } from "@/lib/realtime/topics";
import { useLive } from "@/lib/realtime/use-live";
import type { RideView } from "@/lib/services/rides";
import { PAYMENT_METHOD_LABELS } from "@/lib/wallet";

import { cancelRideAction, getRideAction } from "../actions";
import { TripPayment } from "./TripPayment";

/**
 * The rider's live trip: "5 · Finding Pilot" → "6 · Pilot on the way" →
 * on trip → paying ("7b") → "7 · Trip done". Kept in sync by useLive
 * (Realtime + polling) until the ride is over and paid.
 * A demo ride polls /api/demo/tick instead, which also drives its
 * simulated Pilot.
 */
export function RideTracker({ initial }: { initial: RideView }) {
  const [ride, setRide] = useState<RideView>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ended = ["completed", "cancelled", "expired", "no_show"].includes(ride.status);
  const awaitingPayment =
    ride.status === "completed" &&
    (ride.paymentStatus === "pending" || ride.paymentStatus === "failed");
  const finished = ended && !awaitingPayment;

  async function refresh() {
    if (finished) return;
    if (ride.isDemo) {
      const res = await fetch("/api/demo/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rideId: ride.id }),
      });
      if (res.ok) setRide(((await res.json()) as { ride: RideView }).ride);
      return;
    }
    const result = await getRideAction({ rideId: ride.id });
    if (result.ok) setRide(result.data);
  }

  useLive(finished ? null : topics.ride(ride.id), refresh, ride.isDemo ? 2_000 : 3_000);

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelRideAction({ rideId: ride.id, reason: "Cancelled by rider" });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRide({ ...ride, status: "cancelled" });
    });
  }

  if (awaitingPayment) return <TripPayment ride={ride} onChange={refresh} />;
  if (ride.status === "completed") return <TripDone ride={ride} />;
  if (ended) return <Ended status={ride.status} />;

  const waiting = ride.status === "requested";
  const minutes = Math.max(1, Math.round(ride.durationS / 60));

  return (
    <div className="relative h-dvh overflow-hidden">
      <div className="absolute inset-0">
        <LiveMap
          center={ride.pickup.point}
          pickup={ride.pickup.point}
          drop={ride.drop.point}
          car={ride.pilot?.point ?? undefined}
          route={ride.routeCoordinates}
          bottomInset={0.55}
        />
      </div>

      {!waiting && (
        <div className="absolute top-6 right-5">
          <Button
            variant="destructive"
            disabled
            title="SOS arrives with the safety features"
            className="h-12 rounded-full bg-destructive px-5 font-bold text-white shadow-float"
          >
            <ShieldAlert className="size-[18px]" aria-hidden />
            SOS
          </Button>
        </div>
      )}

      <section
        className="absolute inset-x-0 bottom-0 flex flex-col gap-4 rounded-t-[var(--radius-sheet)] bg-card px-5 pt-3 pb-6 shadow-sheet"
        aria-live="polite"
      >
        <div className="h-[5px] w-10 self-center rounded-full bg-border" aria-hidden />

        {waiting ? (
          <>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-2xl font-bold tracking-tight">
                Finding your Pilot…
              </h1>
              <p className="text-[15px] text-muted-foreground">
                Asking nearby Pilots. This usually takes under a minute.
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full w-1/2 animate-pulse rounded-full bg-primary" />
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h1 className="font-heading text-[22px] font-bold tracking-tight">
                  {ride.status === "accepted" && "Your Pilot is on the way"}
                  {ride.status === "arrived" && "Your Pilot has arrived"}
                  {ride.status === "in_progress" && `Heading to ${ride.drop.address}`}
                </h1>
                <span className="text-sm text-muted-foreground">
                  {ride.status === "in_progress"
                    ? "Sit back — you'll see the fare when you arrive."
                    : `Meet at ${ride.pickup.address}`}
                </span>
              </div>
              {ride.rideCode && ride.status !== "in_progress" && (
                <div className="flex flex-col items-center gap-1 rounded-md bg-ink px-3 py-2 text-on-ink">
                  <span className="text-[11px] font-bold tracking-widest uppercase">Code</span>
                  <span
                    className="font-heading text-[22px] font-bold tracking-[0.2em]"
                    data-testid="ride-code"
                  >
                    {ride.rideCode}
                  </span>
                </div>
              )}
            </div>

            {ride.pilot && <PilotCard pilot={ride.pilot} />}
          </>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {TIER_RATES[ride.tier].label} · {minutes} min ·{" "}
              {PAYMENT_METHOD_LABELS[ride.paymentMethod]}
            </span>
            <span className="truncate font-semibold">{ride.drop.address}</span>
          </span>
          <span className="font-heading font-bold">{formatRupees(ride.totalPaise)}</span>
        </div>

        {error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
        {(ride.status === "requested" || ride.status === "accepted") && (
          <div className="flex gap-2.5">
            <Button
              variant="outline"
              onClick={cancel}
              disabled={pending}
              className="h-[54px] flex-1 rounded-lg text-base font-bold text-danger-text"
            >
              {pending ? "Cancelling…" : "Cancel ride"}
            </Button>
            {!waiting && (
              <Button
                variant="outline"
                disabled
                title="Calling arrives with chat"
                className="h-[54px] rounded-lg px-5"
              >
                <Phone className="size-5" aria-hidden />
                <span className="sr-only">Call Pilot</span>
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

function PilotCard({ pilot }: { pilot: NonNullable<RideView["pilot"]> }) {
  return (
    <div className="flex items-center gap-3.5 rounded-xl bg-muted p-3.5">
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-info font-heading text-xl font-bold text-white dark:text-ink">
        {initials(pilot.name)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-bold" data-testid="pilot-name">
          {pilot.name}
        </span>
        <span className="text-sm text-muted-foreground">{pilot.vehicle}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="size-3 fill-current" aria-hidden />
          {pilot.rating?.toFixed(1) ?? "New"} · {pilot.cometId}
        </span>
      </div>
      <span className="rounded-sm border-2 border-foreground px-2 py-1.5 font-heading text-xs font-bold tracking-wider whitespace-nowrap">
        {pilot.plate}
      </span>
    </div>
  );
}

/** "7 · Trip done": paid, with the fare breakdown. Ratings and tips arrive in phase 7. */
function TripDone({ ride }: { ride: RideView }) {
  return (
    <main className="flex min-h-dvh flex-col gap-5 px-5 pt-8 pb-6">
      <div className="flex flex-col items-center gap-2.5 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-8" aria-hidden strokeWidth={2.6} />
        </div>
        <h1 className="font-heading text-[26px] font-bold tracking-tight">You&apos;ve arrived</h1>
        <p className="text-[15px] text-muted-foreground">
          {ride.drop.address} · {(ride.distanceM / 1000).toFixed(1)} km
        </p>
      </div>

      <section className="flex flex-col gap-2.5 rounded-xl bg-card p-4 text-[15px]">
        <div className="flex justify-between text-muted-foreground">
          <span>Trip fare</span>
          <span>{formatRupees(ride.farePaise)}</span>
        </div>
        {ride.waitingFeePaise > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Waiting time</span>
            <span>{formatRupees(ride.waitingFeePaise)}</span>
          </div>
        )}
        <div className="h-px bg-border" />
        <div className="flex items-center justify-between">
          <span className="font-bold">Paid · {PAYMENT_METHOD_LABELS[ride.paymentMethod]}</span>
          <span className="font-heading text-xl font-bold" data-testid="trip-total">
            {formatRupees(ride.totalPaise)}
          </span>
        </div>
      </section>

      <p className="text-center text-sm text-muted-foreground">
        Rating your Pilot opens in a later build phase.
      </p>

      <Link
        href="/ride"
        className="mt-auto flex h-14 items-center justify-center rounded-lg bg-primary text-[17px] font-bold text-primary-foreground"
      >
        Done
      </Link>
    </main>
  );
}

function Ended({ status }: { status: RideView["status"] }) {
  const noPilots = status === "expired";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <h1 className="font-heading text-2xl font-bold">
        {noPilots
          ? "No Pilots nearby right now"
          : status === "no_show"
            ? "Your Pilot couldn't wait"
            : "Ride cancelled"}
      </h1>
      <p className="text-muted-foreground">
        {noPilots
          ? "Nobody accepted in time. Try again, or pick another ride type."
          : status === "no_show"
            ? "Your Pilot waited 5 minutes at the pickup. A ₹40 no-show fee applies."
            : "Your ride was cancelled. You weren't charged."}
      </p>
      <Link
        href={noPilots ? "/ride/plan" : "/ride"}
        className="flex h-14 w-full items-center justify-center rounded-lg bg-primary text-[17px] font-bold text-primary-foreground"
      >
        {noPilots ? "Try again" : "Back to home"}
      </Link>
    </main>
  );
}
