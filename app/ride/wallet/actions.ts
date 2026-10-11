"use server";

import { runAction } from "@/lib/actions";
import { getCurrentUser } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { chooseRidePayment, createRidePaymentOrder } from "@/lib/services/payments";
import {
  createTopUpOrder,
  failCheckout,
  fakeCheckoutPay,
  getWallet,
  verifyCheckout,
} from "@/lib/services/wallet";
import {
  checkoutFailureSchema,
  checkoutResultSchema,
  choosePaymentSchema,
  orderIdSchema,
  topUpSchema,
} from "@/lib/validation/payments";
import { rideIdSchema } from "@/lib/validation/rides";

/** Wallet and payment actions (docs/API.md "Payments"). */

async function requireUserId() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("UNAUTHENTICATED", "Please sign in again.");
  return user.id;
}

export async function getWalletAction() {
  return runAction("wallet.get", async () => getWallet(await requireUserId()));
}

export async function createTopUpOrderAction(input: unknown) {
  return runAction("wallet.topup_order", async () => {
    const userId = await requireUserId();
    const parsed = topUpSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Add between ₹50 and ₹10,000.");
    return createTopUpOrder(userId, parsed.data.amountPaise);
  });
}

export async function createRidePaymentOrderAction(input: unknown) {
  return runAction("payment.ride_order", async () => {
    const userId = await requireUserId();
    const parsed = rideIdSchema.safeParse(input);
    if (!parsed.success) throw new AppError("NOT_FOUND", "That ride doesn't exist.");
    return createRidePaymentOrder(userId, parsed.data.rideId);
  });
}

/** Checkout's success callback. Verified on the server; credited at most once. */
export async function verifyCheckoutAction(input: unknown) {
  return runAction("payment.verify", async () => {
    const userId = await requireUserId();
    const parsed = checkoutResultSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("PAYMENT_FAILED", "We couldn't verify that payment. No money was taken.");
    }
    await verifyCheckout(userId, parsed.data);
    return getWallet(userId, 0);
  });
}

export async function failCheckoutAction(input: unknown) {
  return runAction("payment.fail", async () => {
    const userId = await requireUserId();
    const parsed = checkoutFailureSchema.safeParse(input);
    if (!parsed.success) return { ok: true };
    await failCheckout(userId, parsed.data.orderId, parsed.data.reason);
    return { ok: true };
  });
}

/** The fake gateway's "Pay" button (development and tests only). */
export async function fakeCheckoutPayAction(input: unknown) {
  return runAction("payment.fake_pay", async () => {
    const userId = await requireUserId();
    const parsed = orderIdSchema.safeParse(input);
    if (!parsed.success) throw new AppError("NOT_FOUND", "We couldn't find that payment.");
    return fakeCheckoutPay(userId, parsed.data.orderId);
  });
}

export async function chooseRidePaymentAction(input: unknown) {
  return runAction("payment.choose", async () => {
    const userId = await requireUserId();
    const parsed = choosePaymentSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION", "Choose a way to pay.");
    await chooseRidePayment(userId, parsed.data.rideId, parsed.data.method);
    return { ok: true };
  });
}
