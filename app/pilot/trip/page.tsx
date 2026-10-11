import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { LiveMap } from "@/components/map/LiveMap";
import { requireUser } from "@/lib/auth/session";
import { formatRupees } from "@/lib/money";
import { getPilotActiveRide } from "@/lib/services/pilots";

export const metadata: Metadata = { title: "Current ride" };

/**
 * "4 · Pickup & OTP" — for now the accepted ride and its pickup. Arriving,
 * the ride code, starting and ending the trip arrive in phase 5.
 */
export default async function PilotTripPage() {
  const user = await requireUser("/pilot/trip");
  const ride = await getPilotActiveRide(user.id);
  if (!ride) redirect("/pilot");

  return (
    <AppFrame>
      <div className="relative h-dvh overflow-hidden">
        <div className="absolute inset-0">
          <LiveMap
            center={ride.pickup.point}
            pickup={ride.pickup.point}
            drop={ride.drop.point}
            route={ride.routeCoordinates}
            bottomInset={0.4}
          />
        </div>
        <section className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-[var(--radius-sheet)] bg-card px-5 pt-3 pb-8 shadow-sheet">
          <div className="h-[5px] w-10 self-center rounded-full bg-border" aria-hidden />
          <h1 className="font-heading text-[22px] font-bold tracking-tight">Head to pickup</h1>
          <p className="text-sm text-muted-foreground">{ride.pickup.address}</p>
          <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3 text-sm">
            <span className="truncate">
              Drop · <span className="font-semibold">{ride.drop.address}</span>
            </span>
            <span className="font-heading font-bold">{formatRupees(ride.totalPaise)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Arriving, the rider&apos;s code and starting the trip open in the next build phase.
          </p>
        </section>
      </div>
    </AppFrame>
  );
}
