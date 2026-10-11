import type { Metadata } from "next";

import { AccountCard } from "@/components/AccountCard";
import { AppFrame } from "@/components/AppFrame";
import { RiderTabBar } from "@/components/RiderTabBar";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

/** "9 · Account & Comet ID" — the menu items arrive with their features. */
export default async function AccountPage() {
  const user = await requireUser("/ride/account");
  return (
    <AppFrame>
      <div className="flex min-h-dvh flex-col">
        <main className="flex flex-1 flex-col gap-5 px-5 pt-7">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Account</h1>
          <AccountCard user={user} roleLabel="Rider" />
        </main>
        <RiderTabBar active="/ride/account" />
      </div>
    </AppFrame>
  );
}
