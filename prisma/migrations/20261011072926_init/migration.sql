-- CreateEnum
CREATE TYPE "theme_preference" AS ENUM ('system', 'light', 'dark');

-- CreateEnum
CREATE TYPE "demo_role" AS ENUM ('rider', 'pilot');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "comet_id" CHAR(10) NOT NULL,
    "display_name" VARCHAR(60) NOT NULL,
    "email" VARCHAR(254),
    "avatar_path" TEXT,
    "safety_pin_hash" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "demo_role" "demo_role",
    "locale" VARCHAR(8) NOT NULL DEFAULT 'en',
    "theme" "theme_preference" NOT NULL DEFAULT 'system',
    "hide_last_name" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_comet_id_key" ON "users"("comet_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_demo_created_idx" ON "users"("is_demo", "created_at");

-- ------------------------------------------------------------------
-- Hand-written below: what Prisma can't express. (docs/DATABASE.md §5)
-- ------------------------------------------------------------------

-- Comet IDs are CMT- plus six Crockford base32 characters (lib/comet-id.ts).
ALTER TABLE "users" ADD CONSTRAINT "users_comet_id_format"
  CHECK ("comet_id" ~ '^CMT-[0-9A-HJKMNP-TV-Z]{6}$');

ALTER TABLE "users" ADD CONSTRAINT "users_display_name_not_blank"
  CHECK (length(btrim("display_name")) > 0);

-- Row-level security with no policies: Supabase's REST API, reachable with
-- the public anon key, can read nothing. All access goes through Prisma
-- on the server. Every future table repeats this line in its migration;
-- tests/integration/rls.int.test.ts fails if one doesn't.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;

-- Prisma's bookkeeping table lives in public too, so it would otherwise
-- be readable through the same API. Conditional because Prisma's shadow
-- database (used by `migrate dev` to check for drift) replays migrations
-- without creating this table.
DO $$
BEGIN
  IF to_regclass('public._prisma_migrations') IS NOT NULL THEN
    ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
