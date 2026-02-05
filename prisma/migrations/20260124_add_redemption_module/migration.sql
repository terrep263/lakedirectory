-- MODULE 5: Redemption Enforcement
-- Immutable audit record of voucher redemption

-- AlterTable: Add expiration to Voucher
ALTER TABLE "Voucher"
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

-- CreateTable: Redemption (immutable audit record)
CREATE TABLE IF NOT EXISTS "Redemption" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "vendorUserId" TEXT NOT NULL,
    "redeemedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "originalValue" DECIMAL(65,30),
    "dealPrice" DECIMAL(65,30),

    CONSTRAINT "Redemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique voucherId (one redemption per voucher)
CREATE UNIQUE INDEX IF NOT EXISTS "Redemption_voucherId_key" ON "Redemption"("voucherId");

-- CreateIndex: Performance indexes
CREATE INDEX IF NOT EXISTS "Redemption_voucherId_idx" ON "Redemption"("voucherId");
CREATE INDEX IF NOT EXISTS "Redemption_businessId_idx" ON "Redemption"("businessId");
CREATE INDEX IF NOT EXISTS "Redemption_dealId_idx" ON "Redemption"("dealId");
CREATE INDEX IF NOT EXISTS "Redemption_vendorUserId_idx" ON "Redemption"("vendorUserId");
CREATE INDEX IF NOT EXISTS "Redemption_redeemedAt_idx" ON "Redemption"("redeemedAt");

-- CreateIndex: Voucher indexes
CREATE INDEX IF NOT EXISTS "Voucher_status_idx" ON "Voucher"("status");
CREATE INDEX IF NOT EXISTS "Voucher_businessId_idx" ON "Voucher"("businessId");
CREATE INDEX IF NOT EXISTS "Voucher_dealId_idx" ON "Voucher"("dealId");
CREATE INDEX IF NOT EXISTS "Voucher_expiresAt_idx" ON "Voucher"("expiresAt");

-- AddForeignKey
ALTER TABLE "Redemption"
ADD CONSTRAINT "Redemption_voucherId_fkey"
FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Redemption"
ADD CONSTRAINT "Redemption_dealId_fkey"
FOREIGN KEY ("dealId") REFERENCES "Deal"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Redemption"
ADD CONSTRAINT "Redemption_vendorUserId_fkey"
FOREIGN KEY ("vendorUserId") REFERENCES "UserIdentity"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
