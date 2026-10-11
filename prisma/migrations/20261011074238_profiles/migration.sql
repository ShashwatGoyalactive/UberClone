-- CreateEnum
CREATE TYPE "women_only_mode" AS ENUM ('off', 'always', 'night');

-- CreateEnum
CREATE TYPE "women_only_fallback" AS ENUM ('ask', 'wait');

-- CreateEnum
CREATE TYPE "pilot_status" AS ENUM ('pending', 'approved', 'rejected', 'suspended');

-- CreateEnum
CREATE TYPE "vehicle_type" AS ENUM ('bike', 'auto', 'car');

-- CreateEnum
CREATE TYPE "ride_tier" AS ENUM ('bike', 'auto', 'go', 'prime');

-- CreateTable
CREATE TABLE "rider_profiles" (
    "user_id" UUID NOT NULL,
    "rating_avg" DECIMAL(3,2),
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "women_only_mode" "women_only_mode" NOT NULL DEFAULT 'off',
    "women_only_fallback" "women_only_fallback" NOT NULL DEFAULT 'ask',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "rider_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "pilot_profiles" (
    "user_id" UUID NOT NULL,
    "status" "pilot_status" NOT NULL DEFAULT 'pending',
    "vehicle_type" "vehicle_type",
    "tier" "ride_tier",
    "vehicle_model" VARCHAR(60),
    "vehicle_colour" VARCHAR(30),
    "plate" VARCHAR(16),
    "seats" INTEGER,
    "rating_avg" DECIMAL(3,2),
    "rating_count" INTEGER NOT NULL DEFAULT 0,
    "women_passengers_mode" "women_only_mode" NOT NULL DEFAULT 'off',
    "is_simulated" BOOLEAN NOT NULL DEFAULT false,
    "simulated_for_user_id" UUID,
    "approved_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pilot_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE INDEX "pilot_profiles_simulated_for_idx" ON "pilot_profiles"("simulated_for_user_id");

-- AddForeignKey
ALTER TABLE "rider_profiles" ADD CONSTRAINT "rider_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pilot_profiles" ADD CONSTRAINT "pilot_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------
-- Hand-written below: what Prisma can't express. (docs/DATABASE.md §5)
-- ------------------------------------------------------------------

-- A Pilot can't be approved, and so can't go online, without a complete
-- vehicle record.
ALTER TABLE "pilot_profiles" ADD CONSTRAINT "pilot_profiles_approved_needs_vehicle"
  CHECK (
    "status" <> 'approved'
    OR ("vehicle_type" IS NOT NULL AND "tier" IS NOT NULL AND "vehicle_model" IS NOT NULL
        AND "vehicle_colour" IS NOT NULL AND "plate" IS NOT NULL AND "seats" IS NOT NULL)
  );

ALTER TABLE "pilot_profiles" ADD CONSTRAINT "pilot_profiles_seats_range"
  CHECK ("seats" IS NULL OR "seats" BETWEEN 1 AND 8);

ALTER TABLE "rider_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "pilot_profiles" ENABLE ROW LEVEL SECURITY;
