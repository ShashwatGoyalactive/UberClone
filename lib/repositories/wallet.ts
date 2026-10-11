import "server-only";

import { Prisma, type Payment, type WalletEntry } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * The ledger, payments and payouts. Every balance-checked write is one of
 * the plpgsql functions from the wallet migration, called as a single
 * statement — atomic over Supabase's transaction pooler, where Prisma's
 * interactive transactions aren't (docs/ARCHITECTURE.md §9 "Money").
 * Reads are scoped to the acting user.
 */

export async function walletBalance(userId: string): Promise<number> {
  const rows = await db.$queryRaw<{ balance: number }[]>`
    SELECT comet_wallet_balance(${userId}::uuid) AS balance`;
  return rows[0]?.balance ?? 0;
}

export async function listEntries(userId: string, take = 30): Promise<WalletEntry[]> {
  return db.walletEntry.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });
}

/** A credit that isn't balance-checked; a repeated key is a no-op. Returns true if written. */
export async function credit(entry: {
  userId: string;
  amountPaise: number;
  kind: "demo_grant";
  idempotencyKey: string;
  note?: string;
}): Promise<boolean> {
  const { count } = await db.walletEntry.createMany({ data: [entry], skipDuplicates: true });
  return count === 1;
}

export type DebitOutcome = "ok" | "duplicate" | "insufficient";

/**
 * A simulated withdrawal: debits the Pilot's wallet (never below zero)
 * and records the payout in the same statement, so there's never a debit
 * without a payout or the reverse. The request ID makes a double tap a
 * no-op ('duplicate').
 */
export async function withdraw(
  pilotId: string,
  amountPaise: number,
  requestId: string,
): Promise<DebitOutcome> {
  const rows = await db.$queryRaw<{ outcome: DebitOutcome }[]>`
    WITH d AS (
      SELECT comet_wallet_debit(${pilotId}::uuid, ${amountPaise}::integer,
        'payout'::wallet_entry_kind, ${"payout:" + requestId}, 'Withdrawal to bank (simulated)') AS outcome
    ), p AS (
      INSERT INTO payouts (id, pilot_id, amount_paise, status, paid_at)
      SELECT gen_random_uuid(), ${pilotId}::uuid, ${amountPaise}::integer, 'paid', now()
      FROM d WHERE d.outcome = 'ok'
      RETURNING id
    )
    SELECT outcome FROM d`;
  return rows[0]!.outcome;
}

export type SettleOutcome = "paid" | "already" | "insufficient" | "not_completed" | "not_found";

/** Settles a completed ride exactly once (see comet_settle_ride). */
export async function settleRide(
  rideId: string,
  via: "wallet" | "online" | "cash",
  changePaise = 0,
): Promise<SettleOutcome> {
  const rows = await db.$queryRaw<{ outcome: SettleOutcome }[]>`
    SELECT comet_settle_ride(${rideId}::uuid, ${via}, ${changePaise}::integer) AS outcome`;
  return rows[0]!.outcome;
}

export type ConfirmOutcome = "paid" | "already" | "not_found";

/** Applies a verified Razorpay payment exactly once (see comet_confirm_payment). */
export async function confirmPayment(orderId: string, paymentId: string): Promise<ConfirmOutcome> {
  try {
    const rows = await db.$queryRaw<{ outcome: ConfirmOutcome }[]>`
      SELECT comet_confirm_payment(${orderId}, ${paymentId}) AS outcome`;
    return rows[0]!.outcome;
  } catch (err) {
    // The same Razorpay payment ID presented for a different order.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2010") {
      const text = JSON.stringify(err.meta ?? {});
      if (text.includes("23505")) return "already";
    }
    throw err;
  }
}

export async function insertPayment(data: {
  userId: string;
  purpose: "topup" | "ride";
  rideId?: string;
  amountPaise: number;
  razorpayOrderId: string;
}): Promise<Payment> {
  return db.payment.create({ data });
}

export async function findPaymentForUser(userId: string, orderId: string) {
  return db.payment.findFirst({ where: { userId, razorpayOrderId: orderId } });
}

export async function findPaymentByOrder(orderId: string) {
  return db.payment.findUnique({ where: { razorpayOrderId: orderId } });
}

/** Marks an unpaid order failed. A late success can still confirm it. */
export async function markPaymentFailed(orderId: string, reason: string): Promise<void> {
  await db.payment.updateMany({
    where: { razorpayOrderId: orderId, status: "created" },
    data: { status: "failed", failureReason: reason.slice(0, 200) },
  });
}
