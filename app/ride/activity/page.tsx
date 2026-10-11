import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { RiderTabBar } from "@/components/RiderTabBar";
import { requireUser } from "@/lib/auth/session";
import { listRides } from "@/lib/services/history";

import { RideHistory } from "./RideHistory";

export const metadata: Metadata = { title: "Your rides" };

/** "10 · Ride history": Past, Upcoming and Cancelled. */
export default async function ActivityPage() {
  const user = await requireUser("/ride/activity");
  return (
    <AppFrame>
      <div className="flex min-h-dvh flex-col">
        <RideHistory initial={await listRides(user.id, "past", null)} />
        <RiderTabBar active="/ride/activity" />
      </div>
    </AppFrame>
  );
}
