import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";
import { getPilotCurrentRide } from "@/lib/services/pilots";
import { getOpenSos } from "@/lib/services/sos";

import { PilotTrip } from "./PilotTrip";

export const metadata: Metadata = { title: "Current ride" };

export default async function PilotTripPage() {
  const user = await requireUser("/pilot/trip");
  const ride = await getPilotCurrentRide(user.id);
  if (!ride) redirect("/pilot");
  return (
    <AppFrame>
      <PilotTrip
        initial={ride}
        initialSos={await getOpenSos(user.id, ride.id)}
        isDemoUser={user.isDemo}
      />
    </AppFrame>
  );
}
