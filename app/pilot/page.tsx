import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppFrame } from "@/components/AppFrame";
import { CometLogo } from "@/components/icons/CometMark";
import { requireUser } from "@/lib/auth/session";
import { findPilotProfile } from "@/lib/repositories/pilots";
import { getPilotCurrentRide, getPilotStatus } from "@/lib/services/pilots";

import { PilotConsole } from "./PilotConsole";

export const metadata: Metadata = { title: "Comet Pilot" };

/** Pilot home: online switch and live requests. */
export default async function PilotHomePage() {
  const user = await requireUser("/pilot");
  const pilot = await findPilotProfile(user.id);

  if (!pilot) {
    return (
      <AppFrame>
        <main className="flex min-h-dvh flex-col gap-6 px-5 pt-7 pb-8">
          <CometLogo suffix="pilot" />
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            You&apos;re not a Comet Pilot yet
          </h1>
          <p className="text-muted-foreground">
            Pilot sign-up opens in a later build phase. Meanwhile you can try the Pilot side in the
            demo.
          </p>
          <Link href="/demo?role=pilot" className="font-semibold text-info hover:underline">
            Try the Pilot demo
          </Link>
        </main>
      </AppFrame>
    );
  }

  if (await getPilotCurrentRide(user.id)) redirect("/pilot/trip");
  const { isOnline } = await getPilotStatus(user.id);

  return (
    <AppFrame>
      <PilotConsole
        pilotId={user.id}
        initials={user.displayName
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)}
        initiallyOnline={isOnline}
      />
    </AppFrame>
  );
}
