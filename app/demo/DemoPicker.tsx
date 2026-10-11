"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { cn } from "@/lib/utils";

import { startDemoAction } from "./actions";

type Role = "rider" | "pilot";

const ROLES: { id: Role; title: string; sub: string; initials: string; tile: string }[] = [
  {
    id: "rider",
    title: "Ride as Aarav",
    sub: "Book a ride, pay from a wallet, chat and track your Pilot live",
    initials: "A",
    tile: "bg-primary text-primary-foreground",
  },
  {
    id: "pilot",
    title: "Drive as Rohan",
    sub: "Go online, accept requests, navigate and collect payment",
    initials: "RK",
    tile: "bg-info text-white dark:text-ink",
  },
];

const HOW: Record<Role, string[]> = {
  rider: [
    "Book any ride — a simulated Pilot accepts in a few seconds.",
    "Watch the car drive the route live, chat, or try SOS safely.",
    "Open the Pilot demo in another tab to see both sides at once.",
  ],
  pilot: [
    "Go online — demo riders send you requests.",
    "Accept, enter the rider's code, and drive the route.",
    "Collect cash or UPI and watch your earnings update.",
  ],
};

export function DemoPicker({ initialRole }: { initialRole: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(initialRole);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const supabase = supabaseBrowser();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        const { error: signInError } = await supabase.auth.signInAnonymously();
        if (signInError) {
          setError(
            signInError.status === 429
              ? "Too many demos started from your network. Please try again in a little while."
              : "Couldn't start the demo. Please try again.",
          );
          return;
        }
      }
      const result = await startDemoAction({ role });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.replace(result.data.redirectTo);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <div role="radiogroup" aria-label="Choose a demo" className="flex flex-col gap-3">
        {ROLES.map((r) => {
          const selected = role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setRole(r.id)}
              className={cn(
                "flex items-center gap-3.5 rounded-xl border-2 p-4 text-left transition-colors",
                selected ? "border-primary bg-brand-soft" : "border-transparent bg-card",
              )}
            >
              <span
                className={cn(
                  "flex size-13 shrink-0 items-center justify-center rounded-2xl font-heading text-lg font-bold",
                  r.tile,
                )}
              >
                {r.initials}
              </span>
              <span className="flex flex-1 flex-col gap-0.5">
                <span className="text-[17px] font-bold">{r.title}</span>
                <span className="text-sm leading-snug text-muted-foreground">{r.sub}</span>
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "size-[22px] shrink-0 rounded-full",
                  selected ? "border-[7px] border-primary" : "border-2 border-border",
                )}
              />
            </button>
          );
        })}
      </div>

      <section className="flex flex-col gap-3 rounded-lg bg-card p-4">
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">
          How the demo works
        </h2>
        <ol className="flex flex-col gap-3">
          {HOW[role].map((text, i) => (
            <li key={text} className="flex items-start gap-3 text-sm leading-snug">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                {i + 1}
              </span>
              {text}
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-auto flex flex-col gap-2">
        {error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
        <Button
          onClick={start}
          disabled={pending}
          className="h-14 rounded-lg text-[17px] font-bold"
        >
          {pending ? "Setting up your demo…" : role === "rider" ? "Start riding" : "Start driving"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Demo data resets every 24 hours · payments are test mode
        </p>
      </div>
    </div>
  );
}
