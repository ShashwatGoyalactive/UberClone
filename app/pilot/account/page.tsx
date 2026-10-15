import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountCard } from "@/components/AccountCard";
import { AppShell } from "@/components/layout/AppShell";
import { SafetyLink } from "@/components/safety/SafetyLink";
import { SafetyPinCard } from "@/components/safety/SafetyPinCard";
import { hasSafetyPin } from "@/lib/services/sos";
import { requireUser } from "@/lib/auth/session";
import { TIER_RATES, type RideTier } from "@/lib/fares";
import { findPilotProfile } from "@/lib/repositories/pilots";

export const metadata: Metadata = { title: "Pilot account" };

/** "9 · Pilot account": Comet ID and vehicle. Documents arrive with onboarding. */
export default async function PilotAccountPage() {
  const user = await requireUser("/pilot/account");
  const pilot = await findPilotProfile(user.id);
  if (!pilot) redirect("/pilot");

  return (
    <AppShell app="pilot" active="/pilot/account" layout="page" initial={user.displayName[0]}>
      <main className="flex min-h-dvh flex-col gap-5 px-5 pt-6 pb-8 md:mx-auto md:min-h-0 md:max-w-[640px] md:px-0 md:pt-0">
        <div className="flex items-center gap-3">
          <Link
            href="/pilot"
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-full bg-card"
          >
            <ArrowLeft className="size-[22px]" aria-hidden strokeWidth={2.2} />
          </Link>
          <h1 className="font-heading text-[22px] font-bold tracking-tight">Pilot account</h1>
        </div>
        <AccountCard user={user} roleLabel="Pilot" />
        <SafetyPinCard hasPin={await hasSafetyPin(user.id)} isDemo={user.isDemo} />
        <SafetyLink
          href="/pilot/account/women-passengers"
          title="Women passengers only"
          sub="Only get requests from women riders"
        />
        <section className="flex items-center gap-3.5 rounded-lg bg-card p-4">
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="font-bold">
              {pilot.vehicleColour} {pilot.vehicleModel}
            </span>
            <span className="text-sm text-muted-foreground">
              {pilot.tier ? TIER_RATES[pilot.tier as RideTier].label : "No tier yet"} ·{" "}
              {pilot.seats} seats · {pilot.status}
            </span>
          </span>
          <span className="rounded-sm border-2 border-foreground px-2 py-1.5 font-heading text-xs font-bold tracking-wider whitespace-nowrap">
            {pilot.plate}
          </span>
        </section>
      </main>
    </AppShell>
  );
}
