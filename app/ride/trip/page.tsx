import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";
import { getRiderCurrentRide } from "@/lib/services/rides";
import { getOpenSos } from "@/lib/services/sos";

import { RideTracker } from "./RideTracker";

export const metadata: Metadata = { title: "Your ride" };

export default async function TripPage() {
  const user = await requireUser("/ride/trip");
  const ride = await getRiderCurrentRide(user.id);
  if (!ride) redirect("/ride");
  return (
    <AppFrame>
      <RideTracker
        initial={ride}
        initialSos={await getOpenSos(user.id, ride.id)}
        isDemoUser={user.isDemo}
      />
    </AppFrame>
  );
}
