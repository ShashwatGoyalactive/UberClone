"use client";

import { KeyRound } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DEMO_SAFETY_PIN } from "@/lib/safety";

import { setSafetyPinAction } from "@/app/safety/actions";

const pinInput =
  "h-12 w-full rounded-md border border-border bg-transparent px-3 text-center font-heading text-xl tracking-[0.5em] outline-none focus:border-primary";

/**
 * The safety PIN that ends an SOS (docs/PRD.md F9). Changing it needs the
 * current one, so someone holding the phone can't replace it.
 */
export function SafetyPinCard({ hasPin, isDemo }: { hasPin: boolean; isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saved, setSaved] = useState(hasPin);
  const [pending, startTransition] = useTransition();
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 4);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await setSafetyPinAction({ pin, currentPin: saved ? current : null });
      if (!result.ok) {
        setMessage({ ok: false, text: result.message });
        return;
      }
      setSaved(true);
      setOpen(false);
      setCurrent("");
      setPin("");
      setMessage({ ok: true, text: "Safety PIN saved." });
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-lg bg-card p-4" aria-labelledby="pin-heading">
      <div className="flex items-center gap-3">
        <KeyRound className="size-5 text-brand-text" aria-hidden />
        <span className="flex flex-1 flex-col gap-0.5">
          <span id="pin-heading" className="font-bold">
            Safety PIN
          </span>
          <span className="text-[13px] text-muted-foreground">
            {saved ? "Set · needed to end an SOS" : "Not set · you'll need one to end an SOS"}
            {isDemo && saved && ` (demo PIN ${DEMO_SAFETY_PIN})`}
          </span>
        </span>
        {!open && (
          <Button
            variant="outline"
            onClick={() => setOpen(true)}
            className="h-10 rounded-md font-bold"
          >
            {saved ? "Change" : "Set PIN"}
          </Button>
        )}
      </div>
      {open && (
        <div className="flex flex-col gap-2.5">
          {saved && (
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Current PIN
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={current}
                onChange={(e) => setCurrent(digits(e.target.value))}
                className={pinInput}
              />
            </label>
          )}
          <label className="flex flex-col gap-1 text-sm font-semibold">
            New 4-digit PIN
            <input
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(digits(e.target.value))}
              className={pinInput}
            />
          </label>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              className="h-11 flex-1 rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={pending || pin.length !== 4 || (saved && current.length !== 4)}
              className="h-11 flex-1 rounded-md font-bold"
            >
              {pending ? "Saving…" : "Save PIN"}
            </Button>
          </div>
        </div>
      )}
      {message && (
        <p
          role={message.ok ? "status" : "alert"}
          className={
            message.ok
              ? "text-sm font-semibold text-info"
              : "text-sm font-semibold text-danger-text"
          }
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
