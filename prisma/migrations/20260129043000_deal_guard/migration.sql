-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('SUCCESS', 'ALREADY_REDEEMED', 'EXPIRED', 'INVALID_SESSION', 'UNAUTHORIZED', 'VOUCHER_INVALID', 'LOCATION_UNAUTHORIZED', 'BUSINESS_MISMATCH');

-- CreateEnum
CREATE TYPE "DealGuardStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REWRITE_REQUIRED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "aiRewriteVersion" JSONB,
ADD COLUMN     "guardFeedback" TEXT,
ADD COLUMN     "guardStatus" "DealGuardStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "priceCategory" TEXT NOT NULL DEFAULT 'other',
ADD COLUMN     "qualityScore" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "UserIdentity" ADD COLUMN     "dealGuardSuspendedAt" TIMESTAMP(3),
ADD COLUMN     "dealViolationCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DealPriceCap" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "minPrice" DECIMAL(65,30) NOT NULL,
    "maxPrice" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealPriceCap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealGuardAuditLog" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "vendorIdentityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "qualityScore" INTEGER,
    "guardStatus" "DealGuardStatus",
    "feedback" TEXT,
    "aiResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealGuardAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealPaymentCallback" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "callbackSecret" TEXT NOT NULL,
    "callbackUrl" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastCallbackAt" TIMESTAMP(3),
    "callbackFailureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DealPaymentCallback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCallback" (
    "id" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "dealCallbackConfigId" TEXT NOT NULL,
    "externalTransactionId" TEXT NOT NULL,
    "amountPaid" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL,
    "customerReference" TEXT NOT NULL,
    "callbackSignature" TEXT NOT NULL,
    "callbackTimestamp" TIMESTAMP(3) NOT NULL,
    "callbackPayload" JSONB NOT NULL,
    "isSignatureValid" BOOLEAN NOT NULL,
    "issuedVoucherId" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCallback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSession" (
    "id" TEXT NOT NULL,
    "vendorUserId" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "businessIds" TEXT[],
    "locationIds" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorRedemption" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "vendorUserId" TEXT NOT NULL,
    "locationId" TEXT,
    "status" "RedemptionStatus" NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "metadata" JSONB,

    CONSTRAINT "VendorRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoucherAuditLog" (
    "id" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countyId" TEXT,

    CONSTRAINT "VoucherAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DealPriceCap_category_key" ON "DealPriceCap"("category");

-- CreateIndex
CREATE INDEX "DealPriceCap_category_idx" ON "DealPriceCap"("category");

-- CreateIndex
CREATE INDEX "DealGuardAuditLog_dealId_idx" ON "DealGuardAuditLog"("dealId");

-- CreateIndex
CREATE INDEX "DealGuardAuditLog_vendorIdentityId_idx" ON "DealGuardAuditLog"("vendorIdentityId");

-- CreateIndex
CREATE INDEX "DealGuardAuditLog_createdAt_idx" ON "DealGuardAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "DealGuardAuditLog_guardStatus_idx" ON "DealGuardAuditLog"("guardStatus");

-- CreateIndex
CREATE UNIQUE INDEX "DealPaymentCallback_dealId_key" ON "DealPaymentCallback"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "DealPaymentCallback_callbackSecret_key" ON "DealPaymentCallback"("callbackSecret");

-- CreateIndex
CREATE INDEX "DealPaymentCallback_dealId_idx" ON "DealPaymentCallback"("dealId");

-- CreateIndex
CREATE INDEX "DealPaymentCallback_isActive_idx" ON "DealPaymentCallback"("isActive");

-- CreateIndex
CREATE INDEX "PaymentCallback_dealId_idx" ON "PaymentCallback"("dealId");

-- CreateIndex
CREATE INDEX "PaymentCallback_externalTransactionId_idx" ON "PaymentCallback"("externalTransactionId");

-- CreateIndex
CREATE INDEX "PaymentCallback_paymentStatus_idx" ON "PaymentCallback"("paymentStatus");

-- CreateIndex
CREATE INDEX "PaymentCallback_issuedVoucherId_idx" ON "PaymentCallback"("issuedVoucherId");

-- CreateIndex
CREATE INDEX "PaymentCallback_createdAt_idx" ON "PaymentCallback"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentCallback_dealId_externalTransactionId_key" ON "PaymentCallback"("dealId", "externalTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSession_sessionToken_key" ON "VendorSession"("sessionToken");

-- CreateIndex
CREATE INDEX "VendorSession_vendorUserId_idx" ON "VendorSession"("vendorUserId");

-- CreateIndex
CREATE INDEX "VendorSession_sessionToken_idx" ON "VendorSession"("sessionToken");

-- CreateIndex
CREATE INDEX "VendorSession_isActive_idx" ON "VendorSession"("isActive");

-- CreateIndex
CREATE INDEX "VendorSession_expiresAt_idx" ON "VendorSession"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorRedemption_voucherId_key" ON "VendorRedemption"("voucherId");

-- CreateIndex
CREATE INDEX "VendorRedemption_sessionId_idx" ON "VendorRedemption"("sessionId");

-- CreateIndex
CREATE INDEX "VendorRedemption_voucherId_idx" ON "VendorRedemption"("voucherId");

-- CreateIndex
CREATE INDEX "VendorRedemption_dealId_idx" ON "VendorRedemption"("dealId");

-- CreateIndex
CREATE INDEX "VendorRedemption_businessId_idx" ON "VendorRedemption"("businessId");

-- CreateIndex
CREATE INDEX "VendorRedemption_vendorUserId_idx" ON "VendorRedemption"("vendorUserId");

-- CreateIndex
CREATE INDEX "VendorRedemption_status_idx" ON "VendorRedemption"("status");

-- CreateIndex
CREATE INDEX "VendorRedemption_attemptedAt_idx" ON "VendorRedemption"("attemptedAt");

-- CreateIndex
CREATE INDEX "VoucherAuditLog_voucherId_idx" ON "VoucherAuditLog"("voucherId");

-- CreateIndex
CREATE INDEX "VoucherAuditLog_actorType_idx" ON "VoucherAuditLog"("actorType");

-- CreateIndex
CREATE INDEX "VoucherAuditLog_action_idx" ON "VoucherAuditLog"("action");

-- CreateIndex
CREATE INDEX "VoucherAuditLog_createdAt_idx" ON "VoucherAuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "VoucherAuditLog_actorId_idx" ON "VoucherAuditLog"("actorId");

-- CreateIndex
CREATE INDEX "Deal_guardStatus_idx" ON "Deal"("guardStatus");

-- CreateIndex
CREATE INDEX "Deal_lastActiveAt_idx" ON "Deal"("lastActiveAt");

-- AddForeignKey
ALTER TABLE "DealGuardAuditLog" ADD CONSTRAINT "DealGuardAuditLog_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealGuardAuditLog" ADD CONSTRAINT "DealGuardAuditLog_vendorIdentityId_fkey" FOREIGN KEY ("vendorIdentityId") REFERENCES "UserIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealPaymentCallback" ADD CONSTRAINT "DealPaymentCallback_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCallback" ADD CONSTRAINT "PaymentCallback_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentCallback" ADD CONSTRAINT "PaymentCallback_dealCallbackConfigId_fkey" FOREIGN KEY ("dealCallbackConfigId") REFERENCES "DealPaymentCallback"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSession" ADD CONSTRAINT "VendorSession_vendorUserId_fkey" FOREIGN KEY ("vendorUserId") REFERENCES "UserIdentity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRedemption" ADD CONSTRAINT "VendorRedemption_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "VendorSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRedemption" ADD CONSTRAINT "VendorRedemption_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRedemption" ADD CONSTRAINT "VendorRedemption_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorRedemption" ADD CONSTRAINT "VendorRedemption_vendorUserId_fkey" FOREIGN KEY ("vendorUserId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

