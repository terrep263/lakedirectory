-- MODULE 3: Deal Definition (Promotional Offers)
-- This migration adds enhanced deal fields for the directory platform

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('INACTIVE', 'ACTIVE', 'EXPIRED');

-- AlterTable: Add Module 3 fields to Deal
ALTER TABLE "Deal"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "dealCategory" TEXT,
ADD COLUMN IF NOT EXISTS "originalValue" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "dealPrice" DECIMAL(65,30),
ADD COLUMN IF NOT EXISTS "redemptionWindowStart" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "redemptionWindowEnd" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "voucherQuantityLimit" INTEGER,
ADD COLUMN IF NOT EXISTS "dealStatus" "DealStatus" NOT NULL DEFAULT 'INACTIVE',
ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_businessId_idx" ON "Deal"("businessId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_dealStatus_idx" ON "Deal"("dealStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_dealCategory_idx" ON "Deal"("dealCategory");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Deal_createdByUserId_idx" ON "Deal"("createdByUserId");

-- AddForeignKey
ALTER TABLE "Deal"
ADD CONSTRAINT "Deal_createdByUserId_fkey"
FOREIGN KEY ("createdByUserId") REFERENCES "UserIdentity"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
