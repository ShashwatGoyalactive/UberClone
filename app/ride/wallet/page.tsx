import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { ComingSoon } from "@/components/ComingSoon";
import { RiderTabBar } from "@/components/RiderTabBar";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Wallet" };

export default async function Page() {
  await requireUser("/ride/wallet");
  return (
    <AppFrame>
      <div className="flex min-h-dvh flex-col">
        <ComingSoon title="Comet Wallet" phase="wallets and payments (phase 6)" />
        <RiderTabBar active="/ride/wallet" />
      </div>
    </AppFrame>
  );
}
