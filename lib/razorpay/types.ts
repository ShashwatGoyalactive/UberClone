/**
 * The payment gateway as Comet uses it (docs/ARCHITECTURE.md §6). Two
 * implementations: Razorpay in test mode, and a deterministic fake for
 * development and tests, selected in ./index.ts.
 */
export type PaymentGateway = {
  /** "razorpay" opens Razorpay Checkout; "fake" opens Comet's test checkout. */
  readonly kind: "razorpay" | "fake";
  /** The public key ID the browser needs to open checkout. */
  readonly keyId: string;
  createOrder(input: {
    amountPaise: number;
    receipt: string;
    notes: Record<string, string>;
  }): Promise<{ orderId: string }>;
  /** Checks the signature Checkout returns: HMAC-SHA256(order|payment). */
  verifyPayment(orderId: string, paymentId: string, signature: string): boolean;
  /** Checks X-Razorpay-Signature over the raw webhook body. */
  verifyWebhook(rawBody: string, signature: string): boolean;
};
