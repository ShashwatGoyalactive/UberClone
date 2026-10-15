-- CreateEnum
CREATE TYPE "verification_method" AS ENUM ('simulated');

-- CreateTable
CREATE TABLE "identity_verifications" (
    "user_id" UUID NOT NULL,
    "verified_female" BOOLEAN NOT NULL,
    "method" "verification_method" NOT NULL,
    "verified_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_verifications_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "identity_verifications" ADD CONSTRAINT "identity_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "identity_verifications" ENABLE ROW LEVEL SECURITY;
