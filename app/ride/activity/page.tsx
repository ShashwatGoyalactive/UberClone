import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { ComingSoon } from "@/components/ComingSoon";
import { RiderTabBar } from "@/components/RiderTabBar";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Activity" };

export default async function Page() {
  await requireUser("/ride/activity");
  return (
    <AppFrame>
      <div className="flex min-h-dvh flex-col">
        <ComingSoon title="Your rides" phase="ride history (phase 7)" />
        <RiderTabBar active="/ride/activity" />
      </div>
    </AppFrame>
  );
}
