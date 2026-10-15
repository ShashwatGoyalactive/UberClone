/*
  Warnings:

  - You are about to drop the column `userId` on the `ratings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "sos_role" AS ENUM ('rider', 'pilot');

-- CreateEnum
CREATE TYPE "sos_reason" AS ENUM ('rider_unsafe', 'accident', 'medical', 'vehicle', 'other');

-- CreateEnum
CREATE TYPE "sos_status" AS ENUM ('open', 'acknowledged', 'resolved');

-- DropForeignKey
ALTER TABLE "ratings" DROP CONSTRAINT "ratings_userId_fkey";

-- AlterTable
ALTER TABLE "ratings" DROP COLUMN "userId";

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "created_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sos_alerts" (
    "id" UUID NOT NULL,
    "ride_id" UUID NOT NULL,
    "raised_by" UUID NOT NULL,
    "raised_by_role" "sos_role" NOT NULL,
    "reason" "sos_reason",
    "status" "sos_status" NOT NULL DEFAULT 'open',
    "assigned_to" UUID,
    "last_lat" DOUBLE PRECISION,
    "last_lng" DOUBLE PRECISION,
    "resolution_note" VARCHAR(500),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMPTZ,
    "resolved_at" TIMESTAMPTZ,

    CONSTRAINT "sos_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_ride_idx" ON "share_links"("ride_id");

-- CreateIndex
CREATE INDEX "sos_alerts_raiser_idx" ON "sos_alerts"("raised_by", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_ride_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sos_alerts" ADD CONSTRAINT "sos_alerts_raised_by_fkey" FOREIGN KEY ("raised_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------
-- Hand-written below (docs/DATABASE.md "share_links", "sos_alerts").
-- ---------------------------------------------------------------------

-- One live SOS per person per ride: a second tap returns the same alert.
CREATE UNIQUE INDEX "sos_alerts_one_open_per_raiser"
  ON "sos_alerts" ("ride_id", "raised_by") WHERE "status" <> 'resolved';
-- The ops alert banner (docs/DATABASE.md §6).
CREATE INDEX "sos_alerts_unresolved_idx"
  ON "sos_alerts" ("status", "created_at") WHERE "status" <> 'resolved';

ALTER TABLE "share_links" ADD CONSTRAINT "share_links_token_hash_hex"
  CHECK ("token_hash" ~ '^[0-9a-f]{64}$');

ALTER TABLE "share_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sos_alerts" ENABLE ROW LEVEL SECURITY;
