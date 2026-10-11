import Link from "next/link";

import { CometLogo } from "@/components/icons/CometMark";
import { Button } from "@/components/ui/button";

/**
 * Placeholder landing page. The real one ("Portfolio landing page" on the
 * canvas) arrives in phase 10; until then this proves the brand and gets
 * visitors into the demo.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center gap-10 px-6 py-16">
      <div className="flex items-center justify-between">
        <CometLogo size={36} />
        <Link href="/login" className="text-sm font-semibold text-info hover:underline">
          Sign in
        </Link>
      </div>

      <div className="flex flex-col gap-5">
        <h1 className="font-heading text-5xl leading-[1.02] font-bold tracking-tight text-balance sm:text-7xl">
          Rides at comet speed.
        </h1>
        <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
          A real-time ride-hailing platform with two apps — Comet for riders and Comet Pilot for
          drivers. Live tracking, a wallet with UPI, and a safety suite.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild size="lg" className="h-14 rounded-lg px-6 text-base font-bold">
          <Link href="/demo?role=rider">Try as rider</Link>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="h-14 rounded-lg px-6 text-base font-bold"
        >
          <Link href="/demo?role=pilot">Try as Pilot</Link>
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">No sign-up. Demo data resets every 24 hours.</p>
    </main>
  );
}
