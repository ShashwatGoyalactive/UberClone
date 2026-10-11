-- PostGIS, for "nearest Pilots" (docs/ARCHITECTURE.md §4). Supabase keeps
-- extensions in their own schema, which its default search_path includes;
-- the integration database mirrors that (tests/integration/global-setup.ts).
CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- CreateEnum
CREATE TYPE "ride_status" AS ENUM ('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled', 'expired', 'no_show');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('wallet', 'upi', 'card', 'cash');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'paid', 'failed', 'refunded', 'waived');

-- CreateEnum
CREATE TYPE "cancelled_by" AS ENUM ('rider', 'pilot', 'system');

-- CreateEnum
CREATE TYPE "actor_role" AS ENUM ('rider', 'pilot', 'system', 'ops');

-- CreateEnum
CREATE TYPE "offer_status" AS ENUM ('offered', 'accepted', 'declined', 'expired', 'taken');

-- CreateTable
CREATE TABLE "pilot_locations" (
    "pilot_id" UUID NOT NULL,
    "location_point" geography(Point, 4326) NOT NULL,
    "heading_deg" DOUBLE PRECISION,
    "speed_kmh" DOUBLE PRECISION,
    "is_online" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pilot_locations_pkey" PRIMARY KEY ("pilot_id")
);

-- CreateTable
CREATE TABLE "rides" (
    "id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "pilot_id" UUID,
    "quote_id" UUID NOT NULL,
    "tier" "ride_tier" NOT NULL,
    "status" "ride_status" NOT NULL DEFAULT 'requested',
    "pickup_address" VARCHAR(200) NOT NULL,
    "pickup_lat" DOUBLE PRECISION NOT NULL,
    "pickup_lng" DOUBLE PRECISION NOT NULL,
    "drop_address" VARCHAR(200) NOT NULL,
    "drop_lat" DOUBLE PRECISION NOT NULL,
    "drop_lng" DOUBLE PRECISION NOT NULL,
    "route_coordinates" JSONB NOT NULL,
    "distance_m" INTEGER NOT NULL,
    "duration_s" INTEGER NOT NULL,
    "fare_paise" INTEGER NOT NULL,
    "discount_paise" INTEGER NOT NULL DEFAULT 0,
    "waiting_fee_paise" INTEGER NOT NULL DEFAULT 0,
    "cancellation_fee_paise" INTEGER NOT NULL DEFAULT 0,
    "total_paise" INTEGER NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "payment_status" "payment_status" NOT NULL DEFAULT 'pending',
    "ride_code" CHAR(4) NOT NULL,
    "ride_code_attempts" INTEGER NOT NULL DEFAULT 0,
    "women_only" BOOLEAN NOT NULL DEFAULT false,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "simulation_started_at" TIMESTAMPTZ,
    "requested_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMPTZ,
    "arrived_at" TIMESTAMPTZ,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,
    "cancelled_at" TIMESTAMPTZ,
    "cancelled_by" "cancelled_by",
    "cancel_reason" VARCHAR(200),
    "city" VARCHAR(8) NOT NULL DEFAULT 'blr',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_offers" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "pilot_id" UUID NOT NULL,
    "wave" INTEGER NOT NULL,
    "status" "offer_status" NOT NULL DEFAULT 'offered',
    "offered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "responded_at" TIMESTAMPTZ,

    CONSTRAINT "ride_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ride_events" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "type" VARCHAR(40) NOT NULL,
    "actor_id" UUID,
    "actor_role" "actor_role" NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ride_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rides_rider_requested_idx" ON "rides"("rider_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "rides_pilot_completed_idx" ON "rides"("pilot_id", "completed_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "ride_offers_ride_pilot_key" ON "ride_offers"("ride_id", "pilot_id");

-- CreateIndex
CREATE INDEX "ride_events_ride_created_idx" ON "ride_events"("ride_id", "created_at");

-- AddForeignKey
ALTER TABLE "pilot_locations" ADD CONSTRAINT "pilot_locations_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_offers" ADD CONSTRAINT "ride_offers_pilot_id_fkey" FOREIGN KEY ("pilot_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ride_events" ADD CONSTRAINT "ride_events_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------
-- Hand-written below: what Prisma can't express. (docs/DATABASE.md §5–9)
-- ------------------------------------------------------------------

-- Matching searches online, available Pilots by distance.
CREATE INDEX "pilot_locations_point_available_idx"
  ON "pilot_locations" USING GIST ("location_point")
  WHERE "is_online" AND "is_available";

-- One active ride per rider and per Pilot. A double-submitted booking, or
-- a Pilot accepting two rides at once, fails here even if code misses it.
CREATE UNIQUE INDEX "rides_one_active_per_rider"
  ON "rides" ("rider_id")
  WHERE "status" IN ('requested', 'accepted', 'arrived', 'in_progress');
CREATE UNIQUE INDEX "rides_one_active_per_pilot"
  ON "rides" ("pilot_id")
  WHERE "status" IN ('accepted', 'arrived', 'in_progress');

CREATE INDEX "rides_active_status_idx"
  ON "rides" ("status")
  WHERE "status" IN ('requested', 'accepted', 'arrived', 'in_progress');

CREATE INDEX "ride_offers_pilot_offered_idx"
  ON "ride_offers" ("pilot_id", "expires_at")
  WHERE "status" = 'offered';

ALTER TABLE "rides" ADD CONSTRAINT "rides_money_non_negative" CHECK (
  "fare_paise" >= 0 AND "discount_paise" >= 0 AND "waiting_fee_paise" >= 0
  AND "cancellation_fee_paise" >= 0 AND "total_paise" >= 0
);
ALTER TABLE "rides" ADD CONSTRAINT "rides_code_format" CHECK ("ride_code" ~ '^[0-9]{4}$');
ALTER TABLE "rides" ADD CONSTRAINT "rides_pilot_when_assigned" CHECK (
  "status" IN ('requested', 'expired') OR ("status" = 'cancelled' AND "pilot_id" IS NULL) OR "pilot_id" IS NOT NULL
);
ALTER TABLE "rides" ADD CONSTRAINT "rides_in_india" CHECK (
  "pickup_lat" BETWEEN 6 AND 37 AND "pickup_lng" BETWEEN 68 AND 98
  AND "drop_lat" BETWEEN 6 AND 37 AND "drop_lng" BETWEEN 68 AND 98
);

-- The ride state machine, enforced in the database as well as in
-- lib/ride-state.ts. Keep the two in sync: tests/unit/ride-state.test.ts
-- and tests/integration/rides.int.test.ts check both sides.
CREATE FUNCTION "enforce_ride_transition"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."status" = OLD."status" THEN
    RETURN NEW;
  END IF;
  IF (OLD."status", NEW."status") IN (
    ('requested', 'accepted'), ('requested', 'cancelled'), ('requested', 'expired'),
    ('accepted', 'arrived'), ('accepted', 'cancelled'),
    ('arrived', 'in_progress'), ('arrived', 'cancelled'), ('arrived', 'no_show'),
    ('in_progress', 'completed')
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Illegal ride transition % -> %', OLD."status", NEW."status"
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER "rides_enforce_transition"
  BEFORE UPDATE OF "status" ON "rides"
  FOR EACH ROW EXECUTE FUNCTION "enforce_ride_transition"();

-- ride_events is an audit log: rows are written once and never changed.
CREATE FUNCTION "reject_change"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% is append-only', TG_TABLE_NAME USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER "ride_events_append_only"
  BEFORE UPDATE OR DELETE ON "ride_events"
  FOR EACH ROW EXECUTE FUNCTION "reject_change"();

ALTER TABLE "pilot_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "rides" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ride_offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ride_events" ENABLE ROW LEVEL SECURITY;

-- Realtime authorization (docs/SECURITY.md §2): clients may only listen on
-- channels they belong to; only the server (service role) sends. The
-- realtime and auth schemas exist only on Supabase, so this is skipped on
-- the plain Postgres used by CI.
DO $outer$
BEGIN
  IF to_regclass('realtime.messages') IS NULL THEN
    RETURN;
  END IF;

  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.realtime_can_listen(topic text)
    RETURNS boolean
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $body$
    DECLARE
      uid uuid := auth.uid();
      kind text := split_part(topic, ':', 1);
      target text := split_part(topic, ':', 2);
    BEGIN
      IF uid IS NULL OR target !~ '^[0-9a-f-]{36}$' THEN
        RETURN false;
      END IF;
      IF kind IN ('pilot', 'rider') THEN
        RETURN target::uuid = uid;
      END IF;
      IF kind = 'ride' THEN
        RETURN EXISTS (
          SELECT 1 FROM rides r
          WHERE r.id = target::uuid AND (r.rider_id = uid OR r.pilot_id = uid)
        );
      END IF;
      RETURN false;
    END;
    $body$;
  $fn$;

  EXECUTE 'REVOKE ALL ON FUNCTION public.realtime_can_listen(text) FROM PUBLIC';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.realtime_can_listen(text) TO authenticated';

  EXECUTE 'DROP POLICY IF EXISTS "comet members can listen" ON realtime.messages';
  EXECUTE $p$
    CREATE POLICY "comet members can listen" ON realtime.messages
      FOR SELECT TO authenticated
      USING (public.realtime_can_listen(realtime.topic()))
  $p$;
END
$outer$;
