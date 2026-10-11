import "server-only";

import { newErrorId } from "@/lib/errors";
import { log } from "@/lib/log";

import { hmacHex, paymentSignature, signatureMatches } from "./signatures";
import type { PaymentGateway } from "./types";

/** Razorpay Orders API in test mode (rzp_test_ keys only). */
export function createRazorpayGateway(config: {
  keyId: string;
  keySecret: string;
  webhookSecret: string | undefined;
}): PaymentGateway {
  const auth = Buffer.from(`${config.keyId}:${config.keySecret}`).toString("base64");
  return {
    kind: "razorpay",
    keyId: config.keyId,
    async createOrder({ amountPaise, receipt, notes }) {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amountPaise, currency: "INR", receipt, notes }),
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) {
        log.error("razorpay.order_failed", { errorId: newErrorId(), status: res.status });
        throw new Error(`Razorpay order failed with ${res.status}`);
      }
      const order = (await res.json()) as { id: string };
      return { orderId: order.id };
    },
    verifyPayment(orderId, paymentId, signature) {
      return signatureMatches(paymentSignature(config.keySecret, orderId, paymentId), signature);
    },
    verifyWebhook(rawBody, signature) {
      if (!config.webhookSecret) return false;
      return signatureMatches(hmacHex(config.webhookSecret, rawBody), signature);
    },
  };
}
