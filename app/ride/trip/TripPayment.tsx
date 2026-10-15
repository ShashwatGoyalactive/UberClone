"use client";

import { AlertCircle, Banknote, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import { useCheckout } from "@/components/payments/use-checkout";
import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/money";
import type { RideView } from "@/lib/services/rides";
import { cn } from "@/lib/utils";

import {
  chooseRidePaymentAction,
  createRidePaymentOrderAction,
  getWalletAction,
} from "../wallet/actions";

type Tab = "online" | "wallet" | "cash";

const tabFor = (method: RideView["paymentMethod"]): Tab =>
  method === "wallet" ? "wallet" : method === "cash" ? "cash" : "online";

/**
 * "7b · Pay by UPI or cash", and "State · Payment failed" when a wallet
 * charge couldn't go through. The ride is already over; the rider can
 * pay online, from the wallet, or in cash, and switch until it's paid.
 */
export function TripPayment({ ride, onChange }: { ride: RideView; onChange: () => Promise<void> }) {
  const [tab, setTab] = useState<Tab>(tabFor(ride.paymentMethod));
  const [balance, setBalance] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { pay, checkoutElement } = useCheckout();
  const pilotFirst = ride.pilot?.name.split(" ")[0] ?? "your Pilot";
  const walletFailed = ride.paymentStatus === "failed";

  useEffect(() => {
    if (tab !== "wallet") return;
    let live = true;
    void getWalletAction().then((r) => {
      if (live && r.ok) setBalance(r.data.balancePaise);
    });
    return () => {
      live = false;
    };
  }, [tab]);

  function act(body: () => Promise<string | null>) {
    setError(null);
    startTransition(async () => {
      const problem = await body();
      if (problem) setError(problem);
      await onChange();
    });
  }

  const payOnline = () =>
    act(async () => {
      const order = await createRidePaymentOrderAction({ rideId: ride.id });
      if (!order.ok) return order.message;
      const outcome = await pay(order.data, `Ride to ${ride.drop.address}`);
      return outcome.status === "failed" ? outcome.message : null;
    });

  const choose = (method: "wallet" | "cash") =>
    act(async () => {
      const result = await chooseRidePaymentAction({ rideId: ride.id, method });
      return result.ok ? null : result.message;
    });

  const tabs: { id: Tab; label: string; Icon: typeof Wallet }[] = [
    { id: "online", label: "UPI or card", Icon: Smartphone },
    { id: "wallet", label: "Wallet", Icon: Wallet },
    { id: "cash", label: "Cash", Icon: Banknote },
  ];

  return (
    <main className="flex min-h-app flex-col md:mx-auto md:max-w-[520px]">
      <div className="flex flex-col items-center gap-1.5 px-5 pt-8 pb-5 text-center">
        <span className="text-sm text-muted-foreground">
          You&apos;ve arrived · {ride.drop.address}
        </span>
        <h1 className="text-[15px] font-semibold">Amount to pay</h1>
        <span className="font-heading text-5xl font-bold tracking-tight" data-testid="trip-total">
          {formatRupees(ride.totalPaise)}
        </span>
        {ride.waitingFeePaise > 0 && (
          <span className="text-xs text-muted-foreground">
            Includes {formatRupees(ride.waitingFeePaise)} waiting time
          </span>
        )}
      </div>

      {walletFailed && (
        <div
          role="alert"
          className="mx-5 mb-3 flex gap-3 rounded-md bg-danger-soft px-4 py-3 text-sm text-danger-text"
        >
          <AlertCircle className="mt-0.5 size-[18px] shrink-0" aria-hidden />
          <span>
            <b>Payment didn&apos;t go through.</b> Your wallet couldn&apos;t cover this ride, so no
            money was taken. Pay another way below.
          </span>
        </div>
      )}

      <div
        role="tablist"
        aria-label="How to pay"
        className="mx-5 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
      >
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`pay-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="pay-panel"
            onClick={() => {
              setTab(id);
              setError(null);
            }}
            className={cn(
              "flex h-11 items-center justify-center gap-1.5 rounded-md text-sm font-bold",
              tab === id ? "bg-card shadow-sm" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <section
        id="pay-panel"
        role="tabpanel"
        aria-labelledby={`pay-tab-${tab}`}
        className="mt-4 flex flex-1 flex-col gap-4 rounded-t-[var(--radius-sheet)] bg-card px-5 pt-5 pb-6"
      >
        {tab === "online" && (
          <>
            <p className="text-[15px] text-muted-foreground">
              Pay with any UPI app or a card through Razorpay. This is test mode: no real money
              moves.
            </p>
            <Button
              onClick={payOnline}
              disabled={pending}
              className="h-14 rounded-lg text-[17px] font-bold"
            >
              {pending ? "Opening checkout…" : `Pay ${formatRupees(ride.totalPaise)}`}
            </Button>
          </>
        )}

        {tab === "wallet" && (
          <>
            <div className="flex items-center justify-between rounded-lg bg-muted px-4 py-3">
              <span className="text-sm text-muted-foreground">Comet Wallet balance</span>
              <span className="font-heading font-bold" data-testid="pay-wallet-balance">
                {balance === null ? "…" : formatRupees(balance)}
              </span>
            </div>
            <Button
              onClick={() => choose("wallet")}
              disabled={pending || balance === null}
              className="h-14 rounded-lg text-[17px] font-bold"
            >
              Pay {formatRupees(ride.totalPaise)} from wallet
            </Button>
            {balance !== null && balance < ride.totalPaise && (
              <Link
                href="/ride/wallet?return=/ride/trip"
                className="text-center text-sm font-semibold text-info hover:underline"
              >
                Add money to your wallet
              </Link>
            )}
          </>
        )}

        {tab === "cash" &&
          (ride.paymentMethod === "cash" && !walletFailed ? (
            <>
              <h2 className="text-[17px] font-bold">
                Pay {formatRupees(ride.totalPaise)} in cash to {pilotFirst}
              </h2>
              <ol className="flex flex-col gap-2.5 rounded-lg bg-muted p-4 text-sm">
                <li className="flex gap-2.5">
                  <b className="text-brand-text">1</b>Hand {formatRupees(ride.totalPaise)} to{" "}
                  {pilotFirst} before you get out.
                </li>
                <li className="flex gap-2.5">
                  <b className="text-brand-text">2</b>
                  {pilotFirst} taps &quot;Cash received&quot; in the Pilot app.
                </li>
                <li className="flex gap-2.5">
                  <b className="text-brand-text">3</b>Your receipt appears here.
                </li>
              </ol>
              <p
                className="flex items-center gap-2.5 rounded-lg border border-dashed border-primary px-4 py-3.5 font-semibold"
                role="status"
              >
                <span className="size-2.5 animate-pulse rounded-full bg-primary" aria-hidden />
                Waiting for {pilotFirst} to confirm…
              </p>
              <p className="text-[13px] text-muted-foreground">
                Short on change? Pay with a bigger note and {pilotFirst} can add the extra to your
                Comet Wallet.
              </p>
            </>
          ) : (
            <>
              <p className="text-[15px] text-muted-foreground">
                Hand the cash to {pilotFirst}, who confirms it in the Pilot app.
              </p>
              <Button
                variant="outline"
                onClick={() => choose("cash")}
                disabled={pending}
                className="h-14 rounded-lg text-[17px] font-bold"
              >
                I&apos;ll pay cash
              </Button>
            </>
          ))}

        {error && (
          <p role="alert" className="text-sm font-semibold text-danger-text">
            {error}
          </p>
        )}
      </section>
      {checkoutElement}
    </main>
  );
}
