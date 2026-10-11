import "server-only";

import { AppError } from "@/lib/errors";
import { log } from "@/lib/log";
import { formatRupees } from "@/lib/money";
import { gateway } from "@/lib/razorpay";
import { fakeCheckoutSuccess } from "@/lib/razorpay/fake";
import type { PaymentGateway } from "@/lib/razorpay/types";
import { broadcast } from "@/lib/realtime/broadcast";
import { EVENTS, topics } from "@/lib/realtime/topics";
import {
  confirmPayment,
  credit,
  findPaymentByOrder,
  findPaymentForUser,
  insertPayment,
  listEntries,
  markPaymentFailed,
  walletBalance,
  withdraw,
} from "@/lib/repositories/wallet";
import { DEMO_WALLET_GRANT, TOPUP_MAX, TOPUP_MIN, entryTitle } from "@/lib/wallet";

/**
 * Wallets: balances, top-ups through Razorpay (test mode), and simulated
 * Pilot withdrawals (docs/PRD.md F6, docs/API.md "Payments").
 *
 * A balance changes only through the ledger, and money comes in only from
 * a payment whose signature the server has verified — never on the
 * browser's word (docs/SECURITY.md §6).
 */

export type WalletEntryView = {
  id: string;
  title: string;
  amountPaise: number;
  kind: string;
  createdAt: string;
};

export type WalletView = { balancePaise: number; entries: WalletEntryView[] };

export async function getWallet(userId: string, take = 30): Promise<WalletView> {
  const [balancePaise, entries] = await Promise.all([
    walletBalance(userId),
    listEntries(userId, take),
  ]);
  return {
    balancePaise,
    entries: entries.map((e) => ({
      id: e.id,
      title: entryTitle(e.kind, e.amountPaise, e.note),
      amountPaise: e.amountPaise,
      kind: e.kind,
      createdAt: e.createdAt.toISOString(),
    })),
  };
}

export async function getBalance(userId: string): Promise<number> {
  return walletBalance(userId);
}

/** The demo's starting balance, credited once per demo account. */
export async function grantDemoWallet(userId: string): Promise<void> {
  await credit({
    userId,
    amountPaise: DEMO_WALLET_GRANT,
    kind: "demo_grant",
    idempotencyKey: `demo-grant:${userId}`,
    note: "Demo welcome credit",
  });
}

export async function announceBalance(userId: string): Promise<void> {
  await broadcast({
    topic: topics.rider(userId),
    event: EVENTS.walletUpdated,
    payload: { balancePaise: await walletBalance(userId) },
  });
}

export function requireGateway(): PaymentGateway {
  const g = gateway();
  if (!g) {
    throw new AppError(
      "PAYMENT_FAILED",
      "Online payments aren't set up in this environment yet. No money was taken.",
    );
  }
  return g;
}

export type CheckoutOrder = {
  orderId: string;
  keyId: string;
  amountPaise: number;
  gateway: "razorpay" | "fake";
};

export async function createTopUpOrder(
  userId: string,
  amountPaise: number,
): Promise<CheckoutOrder> {
  if (!Number.isSafeInteger(amountPaise) || amountPaise < TOPUP_MIN || amountPaise > TOPUP_MAX) {
    throw new AppError(
      "VALIDATION",
      `Add between ${formatRupees(TOPUP_MIN)} and ${formatRupees(TOPUP_MAX)}.`,
    );
  }
  const g = requireGateway();
  const { orderId } = await g.createOrder({
    amountPaise,
    receipt: `topup_${Date.now()}`,
    notes: { purpose: "topup" },
  });
  await insertPayment({ userId, purpose: "topup", amountPaise, razorpayOrderId: orderId });
  log.info("payment.created", { purpose: "topup", gateway: g.kind });
  return { orderId, keyId: g.keyId, amountPaise, gateway: g.kind };
}

export type CheckoutResult = { orderId: string; paymentId: string; signature: string };

/**
 * Confirms a payment from Checkout's success callback. The signature is
 * checked before anything is credited; the credit itself is idempotent
 * with the webhook (comet_confirm_payment), so a reload or a replay never
 * credits twice.
 */
export async function verifyCheckout(userId: string, result: CheckoutResult) {
  const payment = await findPaymentForUser(userId, result.orderId);
  if (!payment) throw new AppError("NOT_FOUND", "We couldn't find that payment.");
  const g = requireGateway();
  if (!g.verifyPayment(result.orderId, result.paymentId, result.signature)) {
    log.warn("payment.bad_signature", { purpose: payment.purpose });
    await markPaymentFailed(result.orderId, "Signature didn't verify");
    throw new AppError("PAYMENT_FAILED", "We couldn't verify that payment. No money was taken.");
  }
  const outcome = await confirmPayment(result.orderId, result.paymentId);
  if (outcome === "not_found") throw new AppError("NOT_FOUND", "We couldn't find that payment.");
  log.info("payment.verified", { purpose: payment.purpose, repeat: outcome === "already" });
  await announceBalance(userId);
  return { purpose: payment.purpose, rideId: payment.rideId };
}

/** Checkout reported a failure or was closed. The order can still succeed later. */
export async function failCheckout(userId: string, orderId: string, reason: string) {
  const payment = await findPaymentForUser(userId, orderId);
  if (!payment) throw new AppError("NOT_FOUND", "We couldn't find that payment.");
  await markPaymentFailed(orderId, reason);
  log.info("payment.failed", { purpose: payment.purpose });
}

/**
 * The fake checkout's "Pay" button: signs a payment the way Razorpay
 * would. Refused unless the fake gateway is the one in use, so it can
 * never mint a payment in an environment with real Razorpay keys.
 */
export async function fakeCheckoutPay(userId: string, orderId: string) {
  if (gateway()?.kind !== "fake") throw new AppError("FORBIDDEN", "Test checkout isn't available.");
  const payment = await findPaymentForUser(userId, orderId);
  if (!payment) throw new AppError("NOT_FOUND", "We couldn't find that payment.");
  return { orderId, ...fakeCheckoutSuccess(orderId) };
}

type WebhookEvent = {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; error_description?: string | null } };
  };
};

/**
 * Razorpay's server-to-server confirmation: the backstop for a browser
 * that closed before verifying. The signature is checked over the raw
 * body before it's parsed. Returns false for a bad signature.
 */
export async function handleWebhook(rawBody: string, signature: string): Promise<boolean> {
  const g = gateway();
  if (!g || !signature || !g.verifyWebhook(rawBody, signature)) {
    log.warn("payment.webhook_rejected", {});
    return false;
  }
  let event: WebhookEvent;
  try {
    event = JSON.parse(rawBody) as WebhookEvent;
  } catch {
    return false;
  }
  const entity = event.payload?.payment?.entity;
  if (!entity?.id || !entity.order_id) return true; // Not an event Comet acts on.

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const outcome = await confirmPayment(entity.order_id, entity.id);
    log.info("payment.webhook_confirmed", { outcome });
    const payment = await findPaymentByOrder(entity.order_id);
    if (payment) await announceBalance(payment.userId);
  } else if (event.event === "payment.failed") {
    await markPaymentFailed(entity.order_id, entity.error_description ?? "Payment failed");
  }
  return true;
}

/** A simulated withdrawal of the whole balance. No money leaves Comet. */
export async function requestPayout(pilotId: string, amountPaise: number, requestId: string) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new AppError("VALIDATION", "There's nothing to withdraw yet.");
  }
  const outcome = await withdraw(pilotId, amountPaise, requestId);
  if (outcome === "insufficient") {
    throw new AppError("INSUFFICIENT_BALANCE", "You can't withdraw more than your balance.");
  }
  log.info("payout.paid", { repeat: outcome === "duplicate" });
  return { balancePaise: await walletBalance(pilotId) };
}
