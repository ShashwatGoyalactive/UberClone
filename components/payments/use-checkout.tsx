"use client";

import { FlaskConical } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { formatRupees } from "@/lib/money";

import {
  failCheckoutAction,
  fakeCheckoutPayAction,
  verifyCheckoutAction,
} from "@/app/ride/wallet/actions";

/**
 * Takes a payment for an order the server created: Razorpay Checkout in
 * test mode, or Comet's own test checkout when the server runs the fake
 * gateway. Either way the result goes back to the server to be verified;
 * nothing here decides that money arrived (docs/SECURITY.md §6).
 */

export type CheckoutOrder = {
  orderId: string;
  keyId: string;
  amountPaise: number;
  gateway: "razorpay" | "fake";
};

export type CheckoutOutcome =
  { status: "paid" } | { status: "failed"; message: string } | { status: "dismissed" };

type GatewayResult =
  | { kind: "success"; orderId: string; paymentId: string; signature: string }
  | { kind: "failed"; reason: string }
  | { kind: "dismissed" };

const NOT_TAKEN = "Payment didn't go through. No money was taken.";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};
type RazorpayInstance = {
  open(): void;
  on(event: "payment.failed", handler: (r: { error?: { description?: string } }) => void): void;
};
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadRazorpay(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Razorpay Checkout didn't load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

async function openRazorpay(order: CheckoutOrder, description: string): Promise<GatewayResult> {
  await loadRazorpay();
  return new Promise((resolve) => {
    let lastFailure: string | null = null;
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amountPaise,
      currency: "INR",
      name: "Comet",
      description,
      theme: { color: "#FF6B2C" },
      handler: (r: RazorpayResponse) =>
        resolve({
          kind: "success",
          orderId: r.razorpay_order_id,
          paymentId: r.razorpay_payment_id,
          signature: r.razorpay_signature,
        }),
      modal: {
        // Checkout stays open after a failure so the rider can retry;
        // only closing it ends the attempt.
        ondismiss: () =>
          resolve(lastFailure ? { kind: "failed", reason: lastFailure } : { kind: "dismissed" }),
      },
    });
    rzp.on("payment.failed", (r) => {
      lastFailure = r.error?.description ?? "Payment failed";
    });
    rzp.open();
  });
}

type FakeRequest = {
  order: CheckoutOrder;
  description: string;
  resolve: (result: GatewayResult) => void;
};

export function useCheckout(): {
  pay: (order: CheckoutOrder, description: string) => Promise<CheckoutOutcome>;
  checkoutElement: ReactNode;
} {
  const [fake, setFake] = useState<FakeRequest | null>(null);

  async function pay(order: CheckoutOrder, description: string): Promise<CheckoutOutcome> {
    let result: GatewayResult;
    try {
      result =
        order.gateway === "fake"
          ? await new Promise<GatewayResult>((resolve) => setFake({ order, description, resolve }))
          : await openRazorpay(order, description);
    } catch {
      return { status: "failed", message: "Checkout couldn't open. No money was taken." };
    } finally {
      setFake(null);
    }

    if (result.kind === "dismissed") return { status: "dismissed" };
    if (result.kind === "failed") {
      await failCheckoutAction({ orderId: order.orderId, reason: result.reason });
      return { status: "failed", message: NOT_TAKEN };
    }
    const verified = await verifyCheckoutAction({
      orderId: result.orderId,
      paymentId: result.paymentId,
      signature: result.signature,
    });
    return verified.ok ? { status: "paid" } : { status: "failed", message: verified.message };
  }

  return {
    pay,
    checkoutElement: fake ? (
      <FakeCheckout
        order={fake.order}
        description={fake.description}
        onResult={(r) => fake.resolve(r)}
      />
    ) : null,
  };
}

/** Stands in for Razorpay Checkout in development and tests. */
function FakeCheckout({
  order,
  description,
  onResult,
}: {
  order: CheckoutOrder;
  description: string;
  onResult: (result: GatewayResult) => void;
}) {
  const [busy, setBusy] = useState(false);
  const payRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    payRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResult({ kind: "dismissed" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResult]);

  async function payNow() {
    setBusy(true);
    const signed = await fakeCheckoutPayAction({ orderId: order.orderId });
    if (signed.ok) onResult({ kind: "success", ...signed.data });
    else onResult({ kind: "failed", reason: signed.message });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/60 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fake-checkout-title"
        className="flex w-full max-w-[420px] flex-col gap-4 rounded-t-[var(--radius-sheet)] bg-card p-6 shadow-modal sm:rounded-xl"
      >
        <span className="flex items-center gap-2 self-start rounded-full bg-warn-soft px-3 py-1 text-xs font-bold text-warn">
          <FlaskConical className="size-3.5" aria-hidden />
          Test mode · no real money moves
        </span>
        <div className="flex flex-col gap-1">
          <h2 id="fake-checkout-title" className="font-heading text-xl font-bold">
            Comet test checkout
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <span className="font-heading text-4xl font-bold tracking-tight">
          {formatRupees(order.amountPaise)}
        </span>
        <p className="text-sm text-muted-foreground">
          Razorpay isn&apos;t connected in this environment, so this stands in for it. The server
          verifies a signed payment exactly as it would a real one.
        </p>
        <Button
          ref={payRef}
          onClick={payNow}
          disabled={busy}
          className="h-14 rounded-lg text-[17px] font-bold"
        >
          {busy ? "Paying…" : `Pay ${formatRupees(order.amountPaise)}`}
        </Button>
        <Button
          variant="outline"
          onClick={() => onResult({ kind: "failed", reason: "Simulated failure" })}
          disabled={busy}
          className="h-12 rounded-lg font-bold text-danger-text"
        >
          Simulate a failed payment
        </Button>
        <Button
          variant="ghost"
          onClick={() => onResult({ kind: "dismissed" })}
          disabled={busy}
          className="h-11 rounded-lg font-semibold"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
