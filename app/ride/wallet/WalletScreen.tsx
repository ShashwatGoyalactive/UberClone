"use client";

import { ArrowLeft, ArrowUpRight, Plus, RotateCcw, Star } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import { CometMark } from "@/components/icons/CometMark";
import { useCheckout } from "@/components/payments/use-checkout";
import { RiderTabBar } from "@/components/RiderTabBar";
import { Button } from "@/components/ui/button";
import { formatRupees, formatRupeesExact, rupees } from "@/lib/money";
import { topics } from "@/lib/realtime/topics";
import { useLive } from "@/lib/realtime/use-live";
import type { WalletView } from "@/lib/services/wallet";
import { cn } from "@/lib/utils";
import { QUICK_TOPUPS, TOPUP_MAX, TOPUP_MIN } from "@/lib/wallet";

import { createTopUpOrderAction, getWalletAction } from "./actions";

const when = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

/** "8 · Wallet" on the canvas. The balance is the server's; this only displays it. */
export function WalletScreen({
  userId,
  initial,
  returnTo,
}: {
  userId: string;
  initial: WalletView;
  returnTo: string | null;
}) {
  const [wallet, setWallet] = useState(initial);
  const [amount, setAmount] = useState(QUICK_TOPUPS[1]!);
  const [other, setOther] = useState("");
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const { pay, checkoutElement } = useCheckout();

  async function refresh() {
    const result = await getWalletAction();
    if (result.ok) setWallet(result.data);
  }
  // A webhook can credit a payment the browser never confirmed.
  useLive(topics.rider(userId), refresh, 15_000);

  const typed = other.trim() === "" ? null : rupees(Number(other));
  const chosen = typed ?? amount;
  const valid = Number.isSafeInteger(chosen) && chosen >= TOPUP_MIN && chosen <= TOPUP_MAX;

  function addMoney() {
    setMessage(null);
    startTransition(async () => {
      const order = await createTopUpOrderAction({ amountPaise: chosen });
      if (!order.ok) {
        setMessage({ kind: "error", text: order.message });
        return;
      }
      const outcome = await pay(order.data, "Add money to Comet Wallet");
      if (outcome.status === "paid") {
        setMessage({ kind: "ok", text: `${formatRupees(chosen)} added to your wallet.` });
        setOther("");
      } else if (outcome.status === "failed") {
        setMessage({ kind: "error", text: outcome.message });
      }
      await refresh();
    });
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center gap-3 px-5 pt-6">
        <Link
          href={returnTo ?? "/ride"}
          aria-label="Back"
          className="flex size-11 items-center justify-center rounded-full bg-card"
        >
          <ArrowLeft className="size-[22px]" aria-hidden strokeWidth={2.2} />
        </Link>
        <h1 className="font-heading text-[22px] font-bold tracking-tight">Comet Wallet</h1>
      </div>

      <section className="relative mx-5 mt-4 flex flex-col gap-4 overflow-hidden rounded-xl bg-ink p-5 text-on-ink">
        <CometMark className="pointer-events-none absolute -top-10 -right-10 size-44 opacity-20" />
        <div className="relative flex flex-col gap-1">
          <span className="text-sm text-ink-muted">Available balance</span>
          <span
            className="font-heading text-[40px] leading-tight font-bold tracking-tight"
            data-testid="wallet-balance"
          >
            {formatRupeesExact(wallet.balancePaise)}
          </span>
        </div>

        <div role="radiogroup" aria-label="Amount to add" className="relative flex flex-wrap gap-2">
          {QUICK_TOPUPS.map((value) => {
            const on = typed === null && amount === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  setAmount(value);
                  setOther("");
                }}
                className={cn(
                  "h-9 rounded-full px-3.5 text-sm font-semibold",
                  on ? "bg-primary text-primary-foreground" : "bg-ink-raised hover:bg-ink-hover",
                )}
              >
                + {formatRupees(value)}
              </button>
            );
          })}
          <label className="flex h-9 items-center gap-1 rounded-full bg-ink-raised pr-3 pl-3.5 text-sm font-semibold focus-within:ring-2 focus-within:ring-primary">
            <span aria-hidden>₹</span>
            <span className="sr-only">Other amount in rupees</span>
            <input
              inputMode="numeric"
              placeholder="Other"
              value={other}
              onChange={(e) => setOther(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
              className="w-16 bg-transparent outline-none placeholder:text-ink-muted"
            />
          </label>
        </div>

        {typed !== null && !valid && (
          <p className="relative text-sm font-semibold text-ink-accent">
            Add between {formatRupees(TOPUP_MIN)} and {formatRupees(TOPUP_MAX)}.
          </p>
        )}

        <Button
          onClick={addMoney}
          disabled={pending || !valid}
          className="relative h-[52px] rounded-lg text-base font-bold"
        >
          <Plus className="size-[18px]" aria-hidden strokeWidth={2.4} />
          {pending ? "Opening checkout…" : `Add ${valid ? formatRupees(chosen) : "money"}`}
        </Button>
      </section>

      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={cn(
            "mx-5 mt-3 rounded-md px-4 py-3 text-sm font-semibold",
            message.kind === "error" ? "bg-danger-soft text-danger-text" : "bg-info-soft text-info",
          )}
        >
          {message.text}
        </p>
      )}
      {returnTo && message?.kind === "ok" && (
        <Link href={returnTo} className="mx-5 mt-2 text-sm font-semibold text-info hover:underline">
          Back to your ride
        </Link>
      )}

      <section className="mt-4 flex flex-1 flex-col gap-1 rounded-t-[var(--radius-sheet)] bg-card px-5 pt-5">
        <h2 className="mb-1 font-heading text-lg font-bold">Transactions</h2>
        {wallet.entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="flex flex-col" aria-label="Transactions">
            {wallet.entries.map((e) => (
              <li key={e.id} className="flex items-center gap-3.5 border-b border-border py-3">
                <EntryIcon kind={e.kind} credit={e.amountPaise > 0} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-semibold">{e.title}</span>
                  <span className="text-[13px] text-muted-foreground">
                    {when.format(new Date(e.createdAt))}
                  </span>
                </span>
                <span
                  className={cn(
                    "font-heading text-[15px] font-bold",
                    e.amountPaise > 0 && "text-info",
                  )}
                >
                  {e.amountPaise > 0 ? "+" : ""}
                  {formatRupees(e.amountPaise)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="bg-card">
        <RiderTabBar active="/ride/wallet" />
      </div>
      {checkoutElement}
    </div>
  );
}

function EntryIcon({ kind, credit }: { kind: string; credit: boolean }) {
  const Icon =
    kind === "ride_refund"
      ? RotateCcw
      : kind === "demo_grant" || kind === "cashback"
        ? Star
        : credit
          ? Plus
          : ArrowUpRight;
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-md",
        kind === "demo_grant" || kind === "cashback"
          ? "bg-brand-soft text-brand-text"
          : credit
            ? "bg-info-soft text-info"
            : "bg-muted text-foreground",
      )}
    >
      <Icon className="size-[18px]" aria-hidden strokeWidth={2.2} />
    </span>
  );
}
