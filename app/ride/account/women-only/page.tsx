import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AppShell } from "@/components/layout/AppShell";
import { WomenOnlySettings } from "@/components/safety/WomenOnlySettings";
import { requireUser } from "@/lib/auth/session";
import { getWomenOnlySettings } from "@/lib/services/women-only";

export const metadata: Metadata = { title: "Women Pilots only" };

/** "9b · Women Pilots only". */
export default async function WomenOnlyPage() {
  const user = await requireUser("/ride/account/women-only");
  const settings = await getWomenOnlySettings(user.id);
  return (
    <AppShell app="rider" active="/ride/account" layout="page" initial={user.displayName[0]}>
      <main className="flex min-h-dvh flex-col gap-5 px-5 pt-6 pb-8 md:mx-auto md:min-h-0 md:max-w-[640px] md:px-0 md:pt-0">
        <div className="flex items-center gap-3">
          <Link
            href="/ride/account"
            aria-label="Back"
            className="flex size-11 items-center justify-center rounded-full bg-card"
          >
            <ArrowLeft className="size-[22px]" aria-hidden strokeWidth={2.2} />
          </Link>
          <div className="flex flex-col">
            <h1 className="font-heading text-[22px] font-bold tracking-tight">Women Pilots only</h1>
            <span className="text-[13px] text-muted-foreground">Account · Safety</span>
          </div>
        </div>
        <WomenOnlySettings
          side="rider"
          verified={settings.verified}
          mode={settings.mode}
          fallback={settings.fallback}
        />
      </main>
    </AppShell>
  );
}
