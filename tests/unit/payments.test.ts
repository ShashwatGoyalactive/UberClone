import { createHmac } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { createFakeGateway, fakeCheckoutSuccess } from "@/lib/razorpay/fake";
import { gateway, resetGatewayForTests } from "@/lib/razorpay";
import { createRazorpayGateway } from "@/lib/razorpay/real";
import { paymentSignature, signatureMatches } from "@/lib/razorpay/signatures";
import { checkoutResultSchema, topUpSchema } from "@/lib/validation/payments";
import { entryTitle } from "@/lib/wallet";

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
  resetGatewayForTests();
});

describe("Razorpay signatures", () => {
  it("matches Razorpay's documented scheme: HMAC-SHA256 of order|payment", () => {
    const expected = createHmac("sha256", "secret").update("order_abc|pay_def").digest("hex");
    expect(paymentSignature("secret", "order_abc", "pay_def")).toBe(expected);
  });

  it("verifies a payment and a webhook with the real gateway's secrets", () => {
    const g = createRazorpayGateway({
      keyId: "rzp_test_x",
      keySecret: "key-secret",
      webhookSecret: "hook-secret",
    });
    expect(
      g.verifyPayment("order_1", "pay_1", paymentSignature("key-secret", "order_1", "pay_1")),
    ).toBe(true);
    expect(
      g.verifyPayment("order_1", "pay_2", paymentSignature("key-secret", "order_1", "pay_1")),
    ).toBe(false);
    const body = '{"event":"payment.captured"}';
    const sig = createHmac("sha256", "hook-secret").update(body).digest("hex");
    expect(g.verifyWebhook(body, sig)).toBe(true);
    expect(g.verifyWebhook(body + " ", sig)).toBe(false);
  });

  it("rejects malformed signatures without throwing", () => {
    expect(signatureMatches("ab".repeat(32), "not-hex")).toBe(false);
    expect(signatureMatches("ab".repeat(32), "ab")).toBe(false);
  });

  it("refuses webhooks when no webhook secret is configured", () => {
    const g = createRazorpayGateway({
      keyId: "rzp_test_x",
      keySecret: "k",
      webhookSecret: undefined,
    });
    expect(g.verifyWebhook("{}", "00")).toBe(false);
  });

  it("the fake checkout signs payments its gateway accepts, and nothing else does", () => {
    const g = createFakeGateway();
    const { paymentId, signature } = fakeCheckoutSuccess("order_fake1");
    expect(g.verifyPayment("order_fake1", paymentId, signature)).toBe(true);
    expect(g.verifyPayment("order_fake2", paymentId, signature)).toBe(false);
  });
});

describe("choosing the gateway", () => {
  it("uses the fake when externals are faked", () => {
    process.env.COMET_FAKE_EXTERNALS = "1";
    expect(gateway()?.kind).toBe("fake");
  });

  it("refuses live keys: no real money, ever", () => {
    delete process.env.COMET_FAKE_EXTERNALS;
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_live_abc";
    process.env.RAZORPAY_KEY_SECRET = "secret";
    expect(() => gateway()).toThrow(/test keys/);
  });

  it("reports payments unavailable outside dev without keys", () => {
    delete process.env.COMET_FAKE_EXTERNALS;
    delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
    process.env.APP_ENV = "prod";
    expect(gateway()).toBeNull();
  });
});

describe("payment input", () => {
  it("accepts top-ups from ₹50 to ₹10,000 in whole paise", () => {
    expect(topUpSchema.safeParse({ amountPaise: 5_000 }).success).toBe(true);
    expect(topUpSchema.safeParse({ amountPaise: 1_000_000 }).success).toBe(true);
    expect(topUpSchema.safeParse({ amountPaise: 4_999 }).success).toBe(false);
    expect(topUpSchema.safeParse({ amountPaise: 1_000_001 }).success).toBe(false);
    expect(topUpSchema.safeParse({ amountPaise: 5_000.5 }).success).toBe(false);
  });

  it("only accepts Razorpay-shaped IDs and a hex signature", () => {
    const ok = {
      orderId: "order_Abc123XYZ",
      paymentId: "pay_Def456UVW",
      signature: "a".repeat(64),
    };
    expect(checkoutResultSchema.safeParse(ok).success).toBe(true);
    expect(checkoutResultSchema.safeParse({ ...ok, orderId: "order_x'; DROP" }).success).toBe(
      false,
    );
    expect(checkoutResultSchema.safeParse({ ...ok, signature: "zz" }).success).toBe(false);
  });
});

describe("transaction titles", () => {
  it("names entries the way the wallet screen shows them", () => {
    expect(entryTitle("ride_payment", -14_800, "MG Road")).toBe("Ride to MG Road");
    expect(entryTitle("cash_change", 5_200, null)).toBe("Change from cash payment");
    expect(entryTitle("cash_change", -5_200, null)).toBe("Change credited to rider");
    expect(entryTitle("platform_fee", -2_220, "MG Road")).toBe("Comet fee");
  });
});
