import type { Metadata } from "next";

import { AccountCard } from "@/components/AccountCard";
import { AppShell } from "@/components/layout/AppShell";
import { RiderTabBar } from "@/components/RiderTabBar";
import { SafetyLink } from "@/components/safety/SafetyLink";
import { SafetyPinCard } from "@/components/safety/SafetyPinCard";
import { hasSafetyPin } from "@/lib/services/sos";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Account" };

/** "9 · Account & Comet ID" — the menu items arrive with their features. */
export default async function AccountPage() {
  const user = await requireUser("/ride/account");
  return (
    <AppShell app="rider" active="/ride/account" layout="page" initial={user.displayName[0]}>
      <div className="flex min-h-dvh flex-col md:mx-auto md:min-h-0 md:max-w-[640px]">
        <main className="flex flex-1 flex-col gap-5 px-5 pt-7">
          <h1 className="font-heading text-2xl font-bold tracking-tight">Account</h1>
          <AccountCard user={user} roleLabel="Rider" />
          <SafetyPinCard hasPin={await hasSafetyPin(user.id)} isDemo={user.isDemo} />
          <SafetyLink
            href="/ride/account/women-only"
            title="Women Pilots only"
            sub="Ride only with verified women Pilots"
          />
        </main>
        <RiderTabBar active="/ride/account" />
      </div>
    </AppShell>
  );
}
