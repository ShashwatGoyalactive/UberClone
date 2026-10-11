import "server-only";

import { appEnv } from "@/lib/env";
import { log } from "@/lib/log";

import { createFakeGateway } from "./fake";
import { createRazorpayGateway } from "./real";
import type { PaymentGateway } from "./types";

/**
 * Which payment gateway this process uses — the same rules as maps():
 *
 * - COMET_FAKE_EXTERNALS=1 → the fake (tests, CI).
 * - Razorpay test keys → Razorpay. Live keys (rzp_live_) are refused:
 *   no real money ever moves (docs/PRD.md §8).
 * - No keys in dev → the fake, with a warning.
 * - No keys anywhere else → null: payments show as unavailable rather
 *   than quietly pretending to take money.
 */
let gatewayInstance: PaymentGateway | null | undefined;

export function gateway(): PaymentGateway | null {
  if (gatewayInstance !== undefined) return gatewayInstance;
  const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (process.env.COMET_FAKE_EXTERNALS === "1") {
    gatewayInstance = createFakeGateway();
  } else if (keyId && keySecret) {
    if (!keyId.startsWith("rzp_test_")) {
      throw new Error(
        "Only Razorpay test keys (rzp_test_…) are allowed. Comet never takes real money.",
      );
    }
    gatewayInstance = createRazorpayGateway({
      keyId,
      keySecret,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET,
    });
  } else if (appEnv() === "dev") {
    log.warn("razorpay.using_fake", { reason: "Razorpay keys not set" });
    gatewayInstance = createFakeGateway();
  } else {
    log.warn("razorpay.unconfigured", {});
    gatewayInstance = null;
  }
  return gatewayInstance;
}

/** For tests that switch modes. */
export function resetGatewayForTests() {
  gatewayInstance = undefined;
}
