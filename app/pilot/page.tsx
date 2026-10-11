import type { Metadata } from "next";
import Link from "next/link";

import { AccountCard } from "@/components/AccountCard";
import { AppFrame } from "@/components/AppFrame";
import { CometLogo } from "@/components/icons/CometMark";
import { requireUser } from "@/lib/auth/session";
import { findPilotProfile } from "@/lib/repositories/pilots";

export const metadata: Metadata = { title: "Comet Pilot" };

/** Pilot home. Going online and requests arrive in phases 4–5. */
export default async function PilotHomePage() {
  const user = await requireUser("/pilot");
  const pilot = await findPilotProfile(user.id);

  return (
    <AppFrame>
      <main className="flex min-h-dvh flex-col gap-6 px-5 pt-7 pb-8">
        <CometLogo suffix="pilot" />
        {pilot ? (
          <>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              Ready to drive, {user.displayName.split(" ")[0]}?
            </h1>
            <AccountCard user={user} roleLabel="Pilot" />
            <section className="flex items-center gap-3.5 rounded-lg bg-card p-4">
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="font-bold">
                  {pilot.vehicleColour} {pilot.vehicleModel}
                </span>
                <span className="text-sm text-muted-foreground">
                  Comet {pilot.tier === "go" ? "Go" : pilot.tier} · {pilot.seats} seats ·{" "}
                  {pilot.status}
                </span>
              </span>
              <span className="rounded-sm border-2 border-foreground px-2 py-1.5 font-heading text-xs font-bold tracking-wider whitespace-nowrap">
                {pilot.plate}
              </span>
            </section>
            <p className="text-sm text-muted-foreground">
              Going online opens in the next build phases.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              You&apos;re not a Comet Pilot yet
            </h1>
            <p className="text-muted-foreground">
              Pilot sign-up opens in a later build phase. Meanwhile you can try the Pilot side in
              the demo.
            </p>
            <Link href="/demo?role=pilot" className="font-semibold text-info hover:underline">
              Try the Pilot demo
            </Link>
          </>
        )}
      </main>
    </AppFrame>
  );
}
