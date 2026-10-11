-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "tip_paise" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "rater_id" UUID NOT NULL,
    "ratee_id" UUID NOT NULL,
    "stars" SMALLINT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "comment" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" UUID,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ratings_ratee_created_idx" ON "ratings"("ratee_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ratings_ride_rater_key" ON "ratings"("ride_id", "rater_id");

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_rater_id_fkey" FOREIGN KEY ("rater_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_ratee_id_fkey" FOREIGN KEY ("ratee_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Hand-written below (docs/DATABASE.md "ratings", "Money functions").
-- ---------------------------------------------------------------------

ALTER TABLE "rides" ADD CONSTRAINT "rides_tip_non_negative" CHECK ("tip_paise" >= 0);
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_stars_range" CHECK ("stars" BETWEEN 1 AND 5);
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_not_self" CHECK ("rater_id" <> "ratee_id");
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_tags_limit" CHECK (cardinality("tags") <= 8);

ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;

-- Rates the other side of a completed ride, once. In the same statement:
-- the rating, the ratee's running average, and the rider's tip (wallet to
-- Pilot, never overdrawing). Nothing is written unless all of it can be.
-- Returns 'ok', 'duplicate', 'insufficient', 'not_completed' or 'not_found'.
CREATE FUNCTION "comet_rate_ride"(
  p_ride uuid, p_rater uuid, p_stars integer, p_tags text[], p_comment text, p_tip integer
) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  r "rides"%ROWTYPE;
  ratee uuid;
  k text := 'ride:' || p_ride::text;
BEGIN
  IF p_tip < 0 THEN
    RAISE EXCEPTION 'Tip must not be negative' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO r FROM "rides" WHERE "id" = p_ride FOR UPDATE;
  IF NOT FOUND OR p_rater NOT IN (r."rider_id", COALESCE(r."pilot_id", r."rider_id")) THEN
    RETURN 'not_found';
  END IF;
  IF r."status" <> 'completed' OR r."pilot_id" IS NULL THEN RETURN 'not_completed'; END IF;
  ratee := CASE WHEN p_rater = r."rider_id" THEN r."pilot_id" ELSE r."rider_id" END;
  IF p_tip > 0 AND p_rater <> r."rider_id" THEN
    RAISE EXCEPTION 'Only the rider can tip' USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (SELECT 1 FROM "ratings" WHERE "ride_id" = p_ride AND "rater_id" = p_rater) THEN
    RETURN 'duplicate';
  END IF;

  IF p_tip > 0 THEN
    PERFORM "comet_lock_wallet"(p_rater);
    IF "comet_wallet_balance"(p_rater) < p_tip THEN RETURN 'insufficient'; END IF;
  END IF;

  INSERT INTO "ratings" ("id", "ride_id", "rater_id", "ratee_id", "stars", "tags", "comment")
  VALUES (gen_random_uuid(), p_ride, p_rater, ratee, p_stars, COALESCE(p_tags, '{}'), p_comment);

  IF ratee = r."pilot_id" THEN
    UPDATE "pilot_profiles"
    SET "rating_avg" = ROUND((COALESCE("rating_avg", 0) * "rating_count" + p_stars) / ("rating_count" + 1.0), 2),
        "rating_count" = "rating_count" + 1, "updated_at" = now()
    WHERE "user_id" = ratee;
  ELSE
    UPDATE "rider_profiles"
    SET "rating_avg" = ROUND((COALESCE("rating_avg", 0) * "rating_count" + p_stars) / ("rating_count" + 1.0), 2),
        "rating_count" = "rating_count" + 1, "updated_at" = now()
    WHERE "user_id" = ratee;
  END IF;

  IF p_tip > 0 THEN
    INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "ride_id", "idempotency_key", "note")
    VALUES
      (gen_random_uuid(), r."rider_id", -p_tip, 'tip', p_ride, k || ':tip:rider', r."drop_address"),
      (gen_random_uuid(), r."pilot_id", p_tip, 'tip', p_ride, k || ':tip:pilot', r."drop_address");
    UPDATE "rides" SET "tip_paise" = p_tip, "updated_at" = now() WHERE "id" = p_ride;
  END IF;
  RETURN 'ok';
END;
$$;

-- Charges a cancelled or no-show ride's fee once: from the rider's wallet
-- to the Pilot (cancellation fees go 100% to the Pilot). If the wallet
-- can't cover it the fee is waived rather than leaving the rider in debt.
-- Returns 'paid', 'waived', 'none' (no fee) or 'already'.
CREATE FUNCTION "comet_charge_cancellation"(p_ride uuid) RETURNS text
LANGUAGE plpgsql AS $$
DECLARE
  r "rides"%ROWTYPE;
  k text := 'ride:' || p_ride::text;
BEGIN
  SELECT * INTO r FROM "rides" WHERE "id" = p_ride FOR UPDATE;
  IF NOT FOUND OR r."status" NOT IN ('cancelled', 'no_show') THEN RETURN 'none'; END IF;
  IF r."payment_status" <> 'pending' THEN RETURN 'already'; END IF;

  IF r."cancellation_fee_paise" = 0 OR r."pilot_id" IS NULL THEN
    UPDATE "rides" SET "payment_status" = 'waived', "updated_at" = now() WHERE "id" = p_ride;
    RETURN 'none';
  END IF;

  PERFORM "comet_lock_wallet"(r."rider_id");
  IF "comet_wallet_balance"(r."rider_id") < r."cancellation_fee_paise" THEN
    UPDATE "rides" SET "payment_status" = 'waived', "updated_at" = now() WHERE "id" = p_ride;
    RETURN 'waived';
  END IF;

  INSERT INTO "wallet_entries" ("id", "user_id", "amount_paise", "kind", "ride_id", "idempotency_key", "note")
  VALUES
    (gen_random_uuid(), r."rider_id", -r."cancellation_fee_paise", 'cancellation_fee', p_ride, k || ':cancel:rider', r."drop_address"),
    (gen_random_uuid(), r."pilot_id", r."cancellation_fee_paise", 'cancellation_fee', p_ride, k || ':cancel:pilot', r."drop_address");
  UPDATE "rides" SET "payment_status" = 'paid', "payment_method" = 'wallet', "updated_at" = now() WHERE "id" = p_ride;
  RETURN 'paid';
END;
$$;
