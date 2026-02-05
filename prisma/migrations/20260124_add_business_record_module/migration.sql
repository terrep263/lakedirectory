-- MODULE 2: Business Record (Source of Truth)
-- This migration adds the canonical business entity fields

-- CreateEnum
CREATE TYPE "BusinessStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SUSPENDED');

-- AlterTable: Add Module 2 fields to Business
ALTER TABLE "Business"
ADD COLUMN IF NOT EXISTS "businessStatus" "BusinessStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT,
ADD COLUMN IF NOT EXISTS "addressLine1" TEXT,
ADD COLUMN IF NOT EXISTS "addressLine2" TEXT,
ADD COLUMN IF NOT EXISTS "postalCode" TEXT,
ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Business_ownerUserId_key" ON "Business"("ownerUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Business_businessStatus_idx" ON "Business"("businessStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Business_ownerUserId_idx" ON "Business"("ownerUserId");

-- AddForeignKey
ALTER TABLE "Business"
ADD CONSTRAINT "Business_ownerUserId_fkey"
FOREIGN KEY ("ownerUserId") REFERENCES "UserIdentity"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
