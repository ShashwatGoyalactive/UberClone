import { z } from "zod";

import { PAYMENT_METHODS, TOPUP_MAX, TOPUP_MIN } from "@/lib/wallet";

/** Shared by the wallet screens and the payment Server Actions (docs/API.md "Payments"). */

const paise = z.number().int().positive().max(1_000_000_000);

export const topUpSchema = z.object({
  amountPaise: z.number().int().min(TOPUP_MIN).max(TOPUP_MAX),
});

/** Razorpay IDs look like order_XXXXXXXXXXXXXX / pay_XXXXXXXXXXXXXX. */
const razorpayId = (prefix: string) =>
  z.string().regex(new RegExp(`^${prefix}_[A-Za-z0-9]{6,40}$`));

export const orderIdSchema = z.object({ orderId: razorpayId("order") });

export const checkoutResultSchema = z.object({
  orderId: razorpayId("order"),
  paymentId: razorpayId("pay"),
  signature: z.string().regex(/^[0-9a-f]{64}$/),
});

export const checkoutFailureSchema = z.object({
  orderId: razorpayId("order"),
  reason: z.string().trim().min(1).max(200).default("Payment didn't go through"),
});

export const choosePaymentSchema = z.object({
  rideId: z.uuid(),
  method: z.enum(PAYMENT_METHODS),
});

export const cashPaymentSchema = z.object({
  rideId: z.uuid(),
  receivedPaise: paise,
  creditChangeToWallet: z.boolean().default(false),
});

export const payoutSchema = z.object({
  amountPaise: paise,
  requestId: z.uuid(),
});
