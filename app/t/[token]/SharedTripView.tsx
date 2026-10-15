"use client";

import { BadgeCheck, Phone, ShieldAlert, Star } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { CometLogo } from "@/components/icons/CometMark";
import { LiveMap } from "@/components/map/LiveMap";
import { Button } from "@/components/ui/button";
import type { SharedTrip } from "@/lib/services/share";

const time = new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" });

/** "6c · Shared trip link (web)" on the canvas. Polls every 5 seconds. */
export function SharedTripView({ token, initial }: { token: string; initial: SharedTrip }) {
  const [trip, setTrip] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    if (trip.state !== "live" || trip.status === "completed") return;
    const timer = setInterval(async () => {
      const res = await fetch(`/api/share/${encodeURIComponent(token)}`, { cache: "no-store" });
      setTrip((await res.json()) as SharedTrip);
      setNow(Date.now());
    }, 5_000);
    return () => clearInterval(timer);
  }, [token, trip]);

  if (trip.state !== "live") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <CometLogo />
        <h1 className="font-heading text-2xl font-bold">
          {trip.state === "ended" ? "This trip has ended" : "This link isn't working"}
        </h1>
        <p className="text-muted-foreground">
          {trip.state === "ended"
            ? `${trip.riderFirstName}'s trip is over, so live tracking has stopped.`
            : "It may have expired or been mistyped. Ask for a new link."}
        </p>
        <Link href="/" className="font-semibold text-info hover:underline">
          About Comet
        </Link>
      </main>
    );
  }

  const updatedS = trip.carUpdatedAt
    ? Math.max(0, Math.round((now - new Date(trip.carUpdatedAt).getTime()) / 1000))
    : null;
  const headline =
    trip.status === "completed"
      ? `Arrived near ${trip.dropArea.name}`
      : trip.status === "in_progress" && trip.etaAt
        ? `Arriving near ${trip.dropArea.name} by ${time.format(new Date(trip.etaAt))}`
        : trip.status === "arrived"
          ? `The Pilot is at the pickup in ${trip.pickupArea}`
          : trip.status === "accepted"
            ? `The Pilot is on the way to ${trip.pickupArea}`
            : "Looking for a Pilot";

  return (
    <main className="flex min-h-dvh flex-col">
      <header className="flex items-center gap-2 border-b border-border bg-card px-4 py-3">
        <CometLogo />
        <span className="flex-1" />
        <span className="flex items-center gap-1.5 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold tracking-wide text-danger-text">
          <span className="size-2 rounded-full bg-current" aria-hidden />
          {trip.status === "completed" ? "TRIP ENDED" : "LIVE TRIP"}
        </span>
      </header>

      <div className="relative h-[300px] shrink-0 overflow-hidden">
        <LiveMap
          center={trip.car ?? trip.dropArea.point}
          car={trip.car ?? undefined}
          drop={trip.dropArea.point}
        />
        {updatedS !== null && (
          <span className="absolute top-3 left-3 rounded-md bg-card px-3 py-2 text-xs text-muted-foreground shadow-float">
            Updated {updatedS < 5 ? "just now" : `${updatedS} sec ago`}
          </span>
        )}
      </div>

      <section className="relative -mt-6 flex flex-1 flex-col gap-3.5 rounded-t-[var(--radius-sheet)] bg-card px-4 pt-5 pb-4">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-muted-foreground">
            {trip.riderFirstName} shared their trip with you
          </span>
          <h1
            className="font-heading text-[22px] leading-tight font-bold tracking-tight"
            data-testid="share-headline"
          >
            {headline}
          </h1>
        </div>

        {trip.status === "in_progress" && (
          <div className="flex flex-col gap-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.round(trip.progress * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {trip.startedAt && `Picked up ${time.format(new Date(trip.startedAt))} · `}
                {trip.pickupArea}
              </span>
              {trip.kmLeft !== null && <span>{trip.kmLeft.toFixed(1)} km left</span>}
            </div>
          </div>
        )}

        {trip.pilot && (
          <div className="flex items-center gap-3 rounded-lg bg-muted p-3.5">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info font-heading text-[17px] font-bold text-white dark:text-ink">
              {trip.pilot.name[0]}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[15px] font-bold whitespace-nowrap" data-testid="share-pilot">
                {trip.pilot.name}
              </span>
              <span className="flex w-fit items-center gap-1 rounded-full bg-info-soft px-2 py-0.5 text-[11px] font-bold text-info">
                <BadgeCheck className="size-3" aria-hidden />
                Verified Pilot
              </span>
              <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                {trip.pilot.vehicle}
                {trip.pilot.rating && (
                  <>
                    {" · "}
                    <Star className="size-3 fill-current" aria-hidden />
                    {trip.pilot.rating.toFixed(1)}
                  </>
                )}
              </span>
            </span>
            <span className="rounded-sm border-2 border-foreground px-2 py-1.5 font-heading text-xs font-bold tracking-wider whitespace-nowrap">
              {trip.pilot.plate}
            </span>
          </div>
        )}

        <Button
          onClick={() => setCalling(true)}
          className="h-[52px] rounded-lg bg-destructive font-bold text-white hover:bg-destructive/90"
        >
          <ShieldAlert className="size-[18px]" aria-hidden />
          Emergency 112
        </Button>

        <p className="mt-auto text-center text-xs leading-normal text-muted-foreground">
          Phone numbers, payment details and exact addresses are never shown. This link stops
          working an hour after the trip ends.
        </p>
      </section>

      {calling && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="call-title"
            className="flex w-full max-w-[420px] flex-col gap-3 rounded-t-[var(--radius-sheet)] bg-card p-6 sm:rounded-xl"
          >
            <h2 id="call-title" className="flex items-center gap-2 font-heading text-xl font-bold">
              <Phone className="size-5" aria-hidden />
              Call 112 from your phone
            </h2>
            <p className="text-[15px] text-muted-foreground">
              If you think {trip.riderFirstName} is in danger, call 112 from your phone&apos;s
              dialer and tell them the car&apos;s plate number shown here.
            </p>
            <Button onClick={() => setCalling(false)} className="h-12 rounded-lg font-bold">
              OK
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
