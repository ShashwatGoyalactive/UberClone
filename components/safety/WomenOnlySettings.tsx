"use client";

import { BadgeCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WomenOnlyFallback, WomenOnlyMode } from "@/lib/women-only";

import {
  setWomenOnlyPreferenceAction,
  setWomenPassengersModeAction,
  simulateVerificationAction,
} from "@/app/safety/actions";

/**
 * "9b · Women Pilots only" (rider) and "8 · Women passengers only" (Pilot).
 * Verification is simulated in Comet: the button records a verified
 * outcome without any ID, and the screen says so.
 */
export function WomenOnlySettings({
  side,
  verified: initiallyVerified,
  mode: initialMode,
  fallback: initialFallback = "ask",
}: {
  side: "rider" | "pilot";
  verified: boolean;
  mode: WomenOnlyMode;
  fallback?: WomenOnlyFallback;
}) {
  const router = useRouter();
  const [verified, setVerified] = useState(initiallyVerified);
  const [on, setOn] = useState(initialMode !== "off");
  const [when, setWhen] = useState<"always" | "night">(
    initialMode === "night" ? "night" : "always",
  );
  const [fallback, setFallback] = useState<WomenOnlyFallback>(initialFallback);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const rider = side === "rider";

  function verify() {
    setMessage(null);
    startTransition(async () => {
      const result = await simulateVerificationAction();
      if (result.ok) setVerified(true);
      else setMessage({ ok: false, text: result.message });
    });
  }

  function save() {
    setMessage(null);
    const mode: WomenOnlyMode = on ? when : "off";
    startTransition(async () => {
      const result = rider
        ? await setWomenOnlyPreferenceAction({ mode, fallback })
        : await setWomenPassengersModeAction({ mode });
      if (!result.ok) {
        setMessage({ ok: false, text: result.message });
        return;
      }
      setMessage({ ok: true, text: "Saved." });
      router.refresh();
    });
  }

  const status = on
    ? when === "night"
      ? rider
        ? "On for rides between 9 pm and 6 am"
        : "On between 9 pm and 6 am"
      : rider
        ? "On for every ride you book"
        : "On whenever you're online"
    : rider
      ? "Off · you can match with any verified Pilot"
      : "Off · you get all requests";

  return (
    <div className="flex flex-col gap-4">
      <section className="flex items-start gap-3.5 rounded-xl bg-ink p-[18px] text-on-ink">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <span className="flex flex-col gap-1.5">
          <span className="font-heading text-[17px] font-bold">
            {rider ? "Ride with verified women Pilots" : "Only get requests from women riders"}
          </span>
          <span className="text-sm leading-normal text-ink-muted">
            {rider
              ? "For women passengers. We'll only match you with Pilots who are verified women."
              : "For verified women Pilots. Requests from riders who aren't verified women are hidden while this is on."}
          </span>
        </span>
      </section>

      {!verified ? (
        <section className="flex flex-col gap-3 rounded-xl bg-card p-[18px]">
          <h2 className="font-bold">Verify your profile to turn this on</h2>
          <p className="text-sm leading-normal text-muted-foreground">
            {rider
              ? "Women-only rides are for passengers whose profile is verified as female."
              : "This is for Pilots whose profile is verified as female."}{" "}
            A real app would check a government ID (DigiLocker or an ID photo and a selfie). In this
            demo the check is simulated: nothing is uploaded or stored, only the result.
          </p>
          <Button
            onClick={verify}
            disabled={pending}
            className="h-14 rounded-lg text-[17px] font-bold"
          >
            {pending ? "Verifying…" : "Verify my profile (simulated)"}
          </Button>
        </section>
      ) : (
        <>
          <span className="flex items-center gap-2 text-[13px] font-semibold text-info">
            <BadgeCheck className="size-4" aria-hidden />
            Your profile is verified (simulated) · you can use this
          </span>

          <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-card p-4">
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-base font-bold">
                {rider ? "Women Pilots only" : "Women passengers only"}
              </span>
              <span className="text-[13px] text-muted-foreground">{status}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={on}
              onChange={(e) => setOn(e.target.checked)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="relative h-[34px] w-14 shrink-0 rounded-full bg-border transition-colors peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring after:absolute after:top-[3px] after:left-[3px] after:size-7 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-[22px]"
            />
          </label>

          <div className={cn("flex flex-col gap-3", !on && "opacity-45")}>
            <span id="when-label" className="text-[13px] font-semibold text-muted-foreground">
              When should it apply?
            </span>
            <div
              role="radiogroup"
              aria-labelledby="when-label"
              className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1"
            >
              {(["always", "night"] as const).map((w) => (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={when === w}
                  disabled={!on}
                  onClick={() => setWhen(w)}
                  className={cn(
                    "min-h-11 rounded-sm px-2 text-sm leading-tight font-bold",
                    when === w ? "bg-card shadow-sm" : "text-muted-foreground",
                  )}
                >
                  {w === "always" ? (rider ? "Every ride" : "Always") : "Night only · 9 pm–6 am"}
                </button>
              ))}
            </div>

            {rider && (
              <>
                <span
                  id="fallback-label"
                  className="text-[13px] font-semibold text-muted-foreground"
                >
                  If no woman Pilot is nearby
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="fallback-label"
                  className="overflow-hidden rounded-lg bg-card"
                >
                  {(
                    [
                      ["ask", "Ask me first", "We'll check before matching anyone else"],
                      ["wait", "Keep searching", "Only women Pilots, even if it takes longer"],
                    ] as const
                  ).map(([id, label, sub], i) => (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={fallback === id}
                      disabled={!on}
                      onClick={() => setFallback(id)}
                      className={cn(
                        "flex w-full items-center gap-3 px-3.5 py-3 text-left",
                        i > 0 && "border-t border-border",
                      )}
                    >
                      <span className="flex flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-semibold">{label}</span>
                        <span className="text-xs text-muted-foreground">{sub}</span>
                      </span>
                      <span
                        aria-hidden
                        className={cn(
                          "size-[22px] shrink-0 rounded-full",
                          fallback === id
                            ? "border-[7px] border-primary"
                            : "border-2 border-border",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <p className="text-xs leading-normal text-muted-foreground">
            {rider
              ? "Pilots see that a request is women-only, nothing else about your profile. Matching can take a little longer."
              : "Fewer requests can mean lower earnings. Your acceptance rate isn't affected by requests this hides."}
          </p>
          <Button
            onClick={save}
            disabled={pending}
            className="h-14 rounded-lg text-[17px] font-bold"
          >
            {pending ? "Saving…" : "Save"}
          </Button>
        </>
      )}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={cn("text-sm font-semibold", message.ok ? "text-info" : "text-danger-text")}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
