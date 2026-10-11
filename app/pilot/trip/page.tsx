import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";
import { getPilotActiveRide } from "@/lib/services/pilots";

import { PilotTrip } from "./PilotTrip";

export const metadata: Metadata = { title: "Current ride" };

export default async function PilotTripPage() {
  const user = await requireUser("/pilot/trip");
  const ride = await getPilotActiveRide(user.id);
  if (!ride) redirect("/pilot");
  return (
    <AppFrame>
      <PilotTrip initial={ride} />
    </AppFrame>
  );
}
