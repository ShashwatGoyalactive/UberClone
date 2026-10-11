import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { requireUser } from "@/lib/auth/session";
import { getRiderActiveRide } from "@/lib/services/rides";

import { RideTracker } from "./RideTracker";

export const metadata: Metadata = { title: "Your ride" };

export default async function TripPage() {
  const user = await requireUser("/ride/trip");
  const ride = await getRiderActiveRide(user.id);
  if (!ride) redirect("/ride");
  return (
    <AppFrame>
      <RideTracker initial={ride} />
    </AppFrame>
  );
}
