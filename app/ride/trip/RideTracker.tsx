"use client";

import { Phone, ShieldAlert, Star } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { LiveMap } from "@/components/map/LiveMap";
import { Button } from "@/components/ui/button";
import { TIER_RATES } from "@/lib/fares";
import { formatRupees } from "@/lib/money";
import { topics } from "@/lib/realtime/topics";
import { useLive } from "@/lib/realtime/use-live";
import type { RideView } from "@/lib/services/rides";

import { cancelRideAction, getActiveRideAction } from "../actions";

/**
 * The rider's live trip screen: "5 · Finding Pilot" while waiting, then
 * "6 · Pilot on the way". Kept in sync by useLive (Realtime + polling).
 * When the active ride disappears it shows how it ended.
 */
export function RideTracker({ initial }: { initial: RideView }) {
  const [ride, setRide] = useState<RideView | null>(initial);
  const [lastStatus, setLastStatus] = useState(initial.status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function refresh() {
    const result = await getActiveRideAction();
    if (!result.ok) return;
    setRide(result.data);
    if (result.data) setLastStatus(result.data.status);
  }

  useLive(ride ? topics.ride(ride.id) : null, refresh, 3_000);

  function cancel() {
    if (!ride) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelRideAction({ rideId: ride.id, reason: "Cancelled by rider" });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRide(null);
      setLastStatus("cancelled");
    });
  }

  if (!ride) return <Ended lastStatus={lastStatus} />;

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
                <span className="text-sm text-muted-foreground">Meet at {ride.pickup.address}</span>
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

            {ride.pilot && (
              <div className="flex items-center gap-3.5 rounded-xl bg-muted p-3.5">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-info font-heading text-xl font-bold text-white dark:text-ink">
                  {ride.pilot.name
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-bold" data-testid="pilot-name">
                    {ride.pilot.name}
                  </span>
                  <span className="text-sm text-muted-foreground">{ride.pilot.vehicle}</span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3 fill-[#F5A524] text-[#F5A524]" aria-hidden />
                    {ride.pilot.rating?.toFixed(1) ?? "New"} · {ride.pilot.cometId}
                  </span>
                </div>
                <span className="rounded-sm border-2 border-foreground px-2 py-1.5 font-heading text-xs font-bold tracking-wider whitespace-nowrap">
                  {ride.pilot.plate}
                </span>
              </div>
            )}
          </>
        )}

        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted px-4 py-3 text-sm">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">
              {TIER_RATES[ride.tier].label} · {minutes} min · cash
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

function Ended({ lastStatus }: { lastStatus: string }) {
  const noPilots = lastStatus === "requested";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
      <h1 className="font-heading text-2xl font-bold">
        {noPilots ? "No Pilots nearby right now" : "This ride has ended"}
      </h1>
      <p className="text-muted-foreground">
        {noPilots
          ? "Nobody accepted in time. Try again, or pick another ride type."
          : lastStatus === "cancelled"
            ? "Your ride was cancelled. You weren't charged."
            : "Thanks for riding with Comet."}
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
