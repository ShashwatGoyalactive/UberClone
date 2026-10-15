import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { RiderTabBar } from "@/components/RiderTabBar";
import { requireUser } from "@/lib/auth/session";
import { listRides } from "@/lib/services/history";

import { RideHistory } from "./RideHistory";

export const metadata: Metadata = { title: "Your rides" };

/** "10 · Ride history": Past, Upcoming and Cancelled. */
export default async function ActivityPage() {
  const user = await requireUser("/ride/activity");
  return (
    <AppShell app="rider" active="/ride/activity" layout="page" initial={user.displayName[0]}>
      <div className="flex min-h-dvh flex-col md:mx-auto md:min-h-0 md:max-w-[720px]">
        <RideHistory initial={await listRides(user.id, "past", null)} />
        <RiderTabBar active="/ride/activity" />
      </div>
    </AppShell>
  );
}
