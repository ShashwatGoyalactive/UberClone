-- CreateEnum
CREATE TYPE "wallet_entry_kind" AS ENUM ('topup', 'ride_payment', 'ride_refund', 'cancellation_fee', 'waiting_fee', 'tip', 'referral_reward', 'cashback', 'pilot_earning', 'platform_fee', 'payout', 'cash_change', 'demo_grant');

-- CreateEnum
CREATE TYPE "payment_purpose" AS ENUM ('topup', 'ride');

-- CreateEnum
CREATE TYPE "payment_record_status" AS ENUM ('created', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "payout_status" AS ENUM ('requested', 'paid');

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "platform_fee_paise" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "wallet_entries" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "kind" "wallet_entry_kind" NOT NULL,
    "ride_id" UUID,
    "payment_id" UUID,
    "idempotency_key" VARCHAR(120) NOT NULL,
    "note" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "payment_purpose" NOT NULL,
    "ride_id" UUID,
    "amount_paise" INTEGER NOT NULL,
    "razorpay_order_id" VARCHAR(64) NOT NULL,
    "razorpay_payment_id" VARCHAR(64),
    "status" "payment_record_status" NOT NULL DEFAULT 'created',
    "failure_reason" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "pilot_id" UUID NOT NULL,
    "amount_paise" INTEGER NOT NULL,
    "status" "payout_status" NOT NULL DEFAULT 'requested',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMPTZ,

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wallet_entries_idempotency_key_key" ON "wallet_entries"("idempotency_key");

-- CreateIndex
CREATE INDEX "wallet_entries_user_created_idx" ON "wallet_entries"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_order_id_key" ON "payments"("razorpay_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_razorpay_payment_id_key" ON "payments"("razorpay_payment_id");

-- CreateIndex
CREATE INDEX "payments_user_created_idx" ON "payments"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "payouts_pilot_created_idx" ON "payouts"("pilot_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Hand-written below: rules the database enforces itself
-- (docs/DATABASE.md "Money", docs/ARCHITECTURE.md §9 "Money").
-- ---------------------------------------------------------------------

-- Rides booked before this migration: Comet's 15%, rounded down to the
-- paisa — the same rule as splitFare in lib/fares.ts.
UPDATE "rides" SET "platform_fee_paise" = FLOOR("fare_paise" * 1500 / 10000.0);

ALTER TABLE "rides" ADD CONSTRAINT "rides_platform_fee_valid"
  CHECK ("platform_fee_paise" >= 0 AND "platform_fee_paise" <= "fare_paise");
ALTER TABLE "wallet_entries" ADD CONSTRAINT "wallet_entries_amount_nonzero"
  CHECK ("amount_paise" <> 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_amount_positive"
  CHECK ("amount_paise" > 0);
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_purpose"
  CHECK (("purpose" = 'ride') = ("ride_id" IS NOT NULL));
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_amount_positive"
  CHECK ("amount_paise" > 0);

-- The ledger is the audit log for money: entries are never edited or
-- deleted. Corrections are new entries.
CREATE TRIGGER "wallet_entries_append_only"
  BEFORE UPDATE OR DELETE ON "wallet_entries"
  FOR EACH ROW EXECUTE FUNCTION "reject_change"();

ALTER TABLE "wallet_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;

-- Serialises every balance-checked write for one user. A transaction-
-- scoped advisory lock: released at commit, and each function below runs
-- as a single statement, so it holds over Supabase's transaction pooler.
CREATE FUNCTION "comet_lock_wallet"(p_user uuid) RETURNS void
LANGUAGE sql AS $$
  SELECT pg_advisory_xact_lock(hashtextextended('wallet:' || p_user::text, 0));
$$;

CREATE FUNCTION "comet_wallet_balance"(p_user uuid) RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(SUM("amount_paise"), 0)::integer FROM "wallet_entries" WHERE "user_id" = p_user;
$$;

-- A debit that never overdraws. Returns 'ok', 'duplicate' (this key was
-- already applied — a retry) or 'insufficient'.
CREATE FUNCTION "comet_wallet_debit"(
  p_user uuid, p_amount integer, p_kind wallet_entry_kind, p_key text, p_note text
) RETURNS text
LANGUAGE plpgsql AS $$
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Debit amount must be positive' USING ERRCODE = 'check_violation';
  END IF;
  PERFORM "comet_lock_wallet"(p_user);
  IF EXISTS (SELECT 1 FROM "wallet_entries" WHERE "idempotency_key" = p_key) THEN
    RETURN 'duplicate';
  END IF;
  IF "comet_wallet_balance"(p_user) < p_amount THEN
    RETURN 'insufficient';
  END IF;
  INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "idempotency_key", "note")
  VALUES (gen_random_uuid(), p_user, -p_amount, p_kind, p_key, p_note);
  RETURN 'ok';
END;
$$;

-- Settles a completed ride, exactly once. p_via is how the rider paid:
--   'wallet' — debit the rider (refuses to overdraw; marks the ride failed)
--   'online' — a verified Razorpay payment; the rider's money is already in
--   'cash'   — the Pilot holds the cash; p_change of it goes to the
--              rider's wallet instead of being handed back
-- The Pilot earns fare + waiting fee minus Comet's fee. For cash, the
-- Pilot already holds the money, so only Comet's fee (and any change
-- credited to the rider) is taken from their wallet.
-- Returns 'paid', 'already', 'insufficient', 'not_completed' or 'not_found'.
CREATE FUNCTION "comet_settle_ride"(p_ride uuid, p_via text, p_change integer DEFAULT 0)
RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  r "rides"%ROWTYPE;
  k text := 'ride:' || p_ride::text;
BEGIN
  IF p_via NOT IN ('wallet', 'online', 'cash') OR p_change < 0 OR (p_change > 0 AND p_via <> 'cash') THEN
    RAISE EXCEPTION 'Invalid settlement' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO r FROM "rides" WHERE "id" = p_ride FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF r."status" <> 'completed' OR r."pilot_id" IS NULL THEN RETURN 'not_completed'; END IF;
  IF r."payment_status" NOT IN ('pending', 'failed') THEN RETURN 'already'; END IF;

  IF p_via = 'wallet' AND r."total_paise" > 0 THEN
    PERFORM "comet_lock_wallet"(r."rider_id");
    IF "comet_wallet_balance"(r."rider_id") < r."total_paise" THEN
      UPDATE "rides" SET "payment_status" = 'failed', "payment_method" = 'wallet', "updated_at" = now()
      WHERE "id" = p_ride;
      RETURN 'insufficient';
    END IF;
    INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "ride_id", "idempotency_key", "note")
    VALUES (gen_random_uuid(), r."rider_id", -r."total_paise", 'ride_payment', p_ride, k || ':charge', r."drop_address");
  END IF;

  IF p_via <> 'cash' AND r."fare_paise" + r."waiting_fee_paise" > 0 THEN
    INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "ride_id", "idempotency_key", "note")
    VALUES (gen_random_uuid(), r."pilot_id", r."fare_paise" + r."waiting_fee_paise", 'pilot_earning', p_ride, k || ':earning', r."drop_address");
  END IF;
  IF r."platform_fee_paise" > 0 THEN
    INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "ride_id", "idempotency_key", "note")
    VALUES (gen_random_uuid(), r."pilot_id", -r."platform_fee_paise", 'platform_fee', p_ride, k || ':fee', r."drop_address");
  END IF;
  IF p_change > 0 THEN
    INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "ride_id", "idempotency_key", "note")
    VALUES
      (gen_random_uuid(), r."rider_id", p_change, 'cash_change', p_ride, k || ':change:rider', 'Change from your cash payment'),
      (gen_random_uuid(), r."pilot_id", -p_change, 'cash_change', p_ride, k || ':change:pilot', 'Change credited to the rider');
  END IF;

  UPDATE "rides"
  SET "payment_status" = 'paid',
      "payment_method" = CASE p_via
        WHEN 'wallet' THEN 'wallet'::payment_method
        WHEN 'cash' THEN 'cash'::payment_method
        ELSE CASE WHEN r."payment_method" IN ('upi', 'card') THEN r."payment_method" ELSE 'upi'::payment_method END
      END,
      "updated_at" = now()
  WHERE "id" = p_ride;
  RETURN 'paid';
END;
$$;

-- Applies a verified Razorpay payment, exactly once, whether the client's
-- callback or the webhook gets here first. A top-up credits the wallet; a
-- ride payment settles the ride — or, if the ride was already settled
-- another way meanwhile (the rider paid cash too), refunds the amount to
-- the wallet so nobody pays twice.
-- Returns 'paid', 'already' or 'not_found'.
CREATE FUNCTION "comet_confirm_payment"(p_order text, p_payment text) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  p "payments"%ROWTYPE;
  outcome text;
BEGIN
  SELECT * INTO p FROM "payments" WHERE "razorpay_order_id" = p_order FOR UPDATE;
  IF NOT FOUND THEN RETURN 'not_found'; END IF;
  IF p."status" = 'paid' THEN RETURN 'already'; END IF;

  UPDATE "payments"
  SET "status" = 'paid', "razorpay_payment_id" = p_payment, "failure_reason" = NULL, "updated_at" = now()
  WHERE "id" = p."id";

  IF p."purpose" = 'topup' THEN
    INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "payment_id", "idempotency_key", "note")
    VALUES (gen_random_uuid(), p."user_id", p."amount_paise", 'topup', p."id", 'rzp:' || p_payment, 'Added money');
  ELSE
    outcome := "comet_settle_ride"(p."ride_id", 'online');
    IF outcome <> 'paid' THEN
      INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "ride_id", "payment_id", "idempotency_key", "note")
      VALUES (gen_random_uuid(), p."user_id", p."amount_paise", 'ride_refund', p."ride_id", p."id", 'rzp:' || p_payment || ':refund', 'Refund · ride already paid');
    END IF;
  END IF;
  RETURN 'paid';
END;
$$;
