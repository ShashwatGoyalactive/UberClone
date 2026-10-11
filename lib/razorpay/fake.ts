import "server-only";

import { randomBytes } from "node:crypto";

import { hmacHex, paymentSignature, signatureMatches } from "./signatures";
import type { PaymentGateway } from "./types";

/**
 * A stand-in for Razorpay in development and tests (docs/TESTING.md §4).
 * It signs payments the same way Razorpay does, with fixed secrets, so
 * the verification code under test is the real one. Never selected in
 * qa, stage or prod (./index.ts).
 */
export const FAKE_KEY_SECRET = "comet-fake-razorpay-key-secret";
export const FAKE_WEBHOOK_SECRET = "comet-fake-razorpay-webhook-secret";

const id = (prefix: string) => `${prefix}_fake${randomBytes(7).toString("hex")}`;

export function createFakeGateway(): PaymentGateway {
  return {
    kind: "fake",
    keyId: "rzp_test_fake",
    async createOrder() {
      return { orderId: id("order") };
    },
    verifyPayment(orderId, paymentId, signature) {
      return signatureMatches(paymentSignature(FAKE_KEY_SECRET, orderId, paymentId), signature);
    },
    verifyWebhook(rawBody, signature) {
      return signatureMatches(hmacHex(FAKE_WEBHOOK_SECRET, rawBody), signature);
    },
  };
}

/** What the fake checkout returns on "Pay": a payment ID and a valid signature. */
export function fakeCheckoutSuccess(orderId: string) {
  const paymentId = id("pay");
  return { paymentId, signature: paymentSignature(FAKE_KEY_SECRET, orderId, paymentId) };
}
