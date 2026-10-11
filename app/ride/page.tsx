import type { Metadata } from "next";

import { AccountCard } from "@/components/AccountCard";
import { AppFrame } from "@/components/AppFrame";
import { CometLogo } from "@/components/icons/CometMark";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Home" };

/** Rider home. The live map and "Where to?" arrive in phases 3–4. */
export default async function RideHomePage() {
  const user = await requireUser("/ride");
  const firstName = user.displayName.split(" ")[0];

  return (
    <AppFrame>
      <main className="flex min-h-dvh flex-col gap-6 px-5 pt-7 pb-8">
        <CometLogo />
        <h1 className="font-heading text-2xl font-bold tracking-tight">Hi, {firstName}</h1>
        <AccountCard user={user} roleLabel="Rider" />
        <p className="text-sm text-muted-foreground">
          Booking rides opens in the next build phases.
        </p>
      </main>
    </AppFrame>
  );
}
