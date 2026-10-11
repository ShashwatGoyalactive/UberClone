import type { Metadata } from "next";

import { AppFrame } from "@/components/AppFrame";
import { CometLogo } from "@/components/icons/CometMark";

import { DemoPicker } from "./DemoPicker";

export const metadata: Metadata = { title: "Try the demo" };

/** "Demo — pick a role" on the canvas. */
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  const { role } = await searchParams;
  const initialRole = role === "pilot" ? "pilot" : "rider";

  return (
    <AppFrame>
      <main className="flex min-h-dvh flex-col gap-5 px-5 pt-7 pb-6">
        <div className="flex items-center gap-2.5">
          <CometLogo />
          <span className="ml-auto rounded-full bg-brand-soft px-2.5 py-1 text-xs font-bold text-brand-text">
            DEMO
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-[28px] leading-tight font-bold tracking-tight">
            Explore Comet
          </h1>
          <p className="text-[15px] leading-normal text-muted-foreground">
            Pick a side. No sign-up — you&apos;ll use a ready-made demo account.
          </p>
        </div>
        <DemoPicker initialRole={initialRole} />
      </main>
    </AppFrame>
  );
}
