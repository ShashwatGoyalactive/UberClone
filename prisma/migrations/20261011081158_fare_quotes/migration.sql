-- CreateTable
CREATE TABLE "fare_quotes" (
    "id" UUID NOT NULL,
    "rider_id" UUID NOT NULL,
    "pickup_address" VARCHAR(200) NOT NULL,
    "pickup_lat" DOUBLE PRECISION NOT NULL,
    "pickup_lng" DOUBLE PRECISION NOT NULL,
    "drop_address" VARCHAR(200) NOT NULL,
    "drop_lat" DOUBLE PRECISION NOT NULL,
    "drop_lng" DOUBLE PRECISION NOT NULL,
    "distance_m" INTEGER NOT NULL,
    "duration_s" INTEGER NOT NULL,
    "route_coordinates" JSONB NOT NULL,
    "is_estimate" BOOLEAN NOT NULL DEFAULT false,
    "prices" JSONB NOT NULL,
    "surge" DECIMAL(3,2) NOT NULL DEFAULT 1.00,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fare_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fare_quotes_rider_created_idx" ON "fare_quotes"("rider_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_rider_id_fkey" FOREIGN KEY ("rider_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ------------------------------------------------------------------
-- Hand-written below: what Prisma can't express. (docs/DATABASE.md §5)
-- ------------------------------------------------------------------

ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_non_negative"
  CHECK ("distance_m" >= 0 AND "duration_s" >= 0);

ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_surge_range"
  CHECK ("surge" BETWEEN 1.00 AND 2.00);

-- Coordinates must be in India (docs/DATABASE.md §7).
ALTER TABLE "fare_quotes" ADD CONSTRAINT "fare_quotes_in_india"
  CHECK (
    "pickup_lat" BETWEEN 6 AND 37 AND "pickup_lng" BETWEEN 68 AND 98
    AND "drop_lat" BETWEEN 6 AND 37 AND "drop_lng" BETWEEN 68 AND 98
  );

ALTER TABLE "fare_quotes" ENABLE ROW LEVEL SECURITY;
