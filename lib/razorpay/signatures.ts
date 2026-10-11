import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay's two signatures (both HMAC-SHA256, hex):
 * - payment: over `${orderId}|${paymentId}` with the key secret;
 * - webhook: over the raw request body with the webhook secret.
 * Compared in constant time.
 */

export function hmacHex(secret: string, message: string): string {
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function signatureMatches(expectedHex: string, givenHex: string): boolean {
  if (!/^[0-9a-f]+$/i.test(givenHex) || givenHex.length !== expectedHex.length) return false;
  return timingSafeEqual(Buffer.from(expectedHex, "hex"), Buffer.from(givenHex, "hex"));
}

export function paymentSignature(secret: string, orderId: string, paymentId: string): string {
  return hmacHex(secret, `${orderId}|${paymentId}`);
}
