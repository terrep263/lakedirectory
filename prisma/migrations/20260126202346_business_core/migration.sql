/*
  Warnings:

  - A unique constraint covering the columns `[externalPlaceId]` on the table `Business` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "CountyLaunchStatus" AS ENUM ('DRAFT', 'LIVE_SOFT', 'LIVE_PUBLIC');

-- CreateEnum
CREATE TYPE "BusinessSource" AS ENUM ('google', 'manual');

-- CreateEnum
CREATE TYPE "BusinessClaimState" AS ENUM ('claimed', 'unclaimed');

-- CreateEnum
CREATE TYPE "BusinessLifecycleState" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "PurchaseStatus" AS ENUM ('COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "FeaturedType" AS ENUM ('BUSINESS', 'DEAL');

-- CreateEnum
CREATE TYPE "EscalationSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BusinessFlagType" AS ENUM ('DUPLICATE_EXTERNAL_ID', 'DUPLICATE_NAME_ADDRESS', 'INVALID_CITY', 'OUT_OF_BOUNDS', 'PERMANENTLY_CLOSED', 'MISSING_CRITICAL_DATA', 'CATEGORY_MISMATCH');

-- CreateEnum
CREATE TYPE "FlagSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'RESOLVED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "IdentityRole" ADD VALUE 'SUPER_ADMIN';

-- AlterEnum
ALTER TYPE "VoucherStatus" ADD VALUE 'ASSIGNED';

-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "addressComponents" JSONB,
ADD COLUMN     "aggregateRating" DOUBLE PRECISION,
ADD COLUMN     "cityId" TEXT,
ADD COLUMN     "countyId" TEXT,
ADD COLUMN     "curbsidePickup" BOOLEAN,
ADD COLUMN     "currentHours" JSONB,
ADD COLUMN     "delivery" BOOLEAN,
ADD COLUMN     "dineIn" BOOLEAN,
ADD COLUMN     "externalPlaceId" TEXT,
ADD COLUMN     "formattedAddress" TEXT,
ADD COLUMN     "ingestionSource" TEXT,
ADD COLUMN     "internationalPhone" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "mapLocationUrl" TEXT,
ADD COLUMN     "nationalPhone" TEXT,
ADD COLUMN     "operationalStatus" TEXT,
ADD COLUMN     "plusCode" TEXT,
ADD COLUMN     "priceLevel" TEXT,
ADD COLUMN     "priceRange" TEXT,
ADD COLUMN     "regularHours" JSONB,
ADD COLUMN     "secondaryHours" JSONB,
ADD COLUMN     "takeout" BOOLEAN,
ADD COLUMN     "totalRatings" INTEGER,
ADD COLUMN     "userReviews" JSONB;

-- AlterTable
ALTER TABLE "Deal" ADD COLUMN     "countyId" TEXT;

-- AlterTable
ALTER TABLE "Redemption" ADD COLUMN     "countyId" TEXT;

-- AlterTable
ALTER TABLE "Voucher" ADD COLUMN     "countyId" TEXT;

-- AlterTable
ALTER TABLE "VoucherValidation" ADD COLUMN     "countyId" TEXT;

-- CreateTable
CREATE TABLE "County" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "launchStatus" "CountyLaunchStatus" NOT NULL DEFAULT 'DRAFT',
    "googlePlacesConfig" JSONB,
    "boundaryGeometry" JSONB,
    "citiesConfigured" BOOLEAN NOT NULL DEFAULT false,
    "placesIngested" BOOLEAN NOT NULL DEFAULT false,
    "adminVerified" BOOLEAN NOT NULL DEFAULT false,
    "vendorClaimsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "featuredContentEnabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "County_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountyLaunchLog" (
    "id" TEXT NOT NULL,
    "countyId" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "metadata" JSONB,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountyLaunchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CountyDomain" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "countyId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CountyDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "countyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminCountyAccess" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "countyId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedBy" TEXT,

    CONSTRAINT "AdminCountyAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessCore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "streetAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "primaryCategory" TEXT NOT NULL,
    "secondaryCategories" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "googlePlaceId" TEXT,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "hours" JSONB,
    "isOpen" BOOLEAN,
    "source" "BusinessSource" NOT NULL,
    "claimState" "BusinessClaimState" NOT NULL,
    "lifecycleState" "BusinessLifecycleState" NOT NULL DEFAULT 'active',
    "primaryImagePath" TEXT NOT NULL,
    "importBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "BusinessCore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessImportLog" (
    "id" TEXT NOT NULL,
    "importBatchId" TEXT NOT NULL,
    "source" "BusinessSource" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "location" JSONB,
    "category" TEXT,
    "keyword" TEXT,
    "radiusMeters" INTEGER,
    "limit" INTEGER,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "skippedCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "params" JSONB,

    CONSTRAINT "BusinessImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessAuditLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedFields" TEXT[],
    "before" JSONB,
    "after" JSONB,

    CONSTRAINT "BusinessAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "voucherId" TEXT NOT NULL,
    "amountPaid" DECIMAL(65,30) NOT NULL,
    "paymentProvider" TEXT NOT NULL,
    "paymentIntentId" TEXT NOT NULL,
    "status" "PurchaseStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countyId" TEXT,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminActionLog" (
    "id" TEXT NOT NULL,
    "adminUserId" TEXT NOT NULL,
    "actionType" TEXT NOT NULL,
    "targetEntityType" TEXT NOT NULL,
    "targetEntityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countyId" TEXT,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderStatus" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "grantedBy" TEXT NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "countyId" TEXT,

    CONSTRAINT "FounderStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedContent" (
    "id" TEXT NOT NULL,
    "entityType" "FeaturedType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),
    "removedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "countyId" TEXT,

    CONSTRAINT "FeaturedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminEscalation" (
    "id" TEXT NOT NULL,
    "escalationType" TEXT NOT NULL,
    "severity" "EscalationSeverity" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "countyId" TEXT,

    CONSTRAINT "AdminEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BulkImportJob" (
    "id" TEXT NOT NULL,
    "countyId" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'PENDING',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "successfulRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "flaggedRecords" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "BulkImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessFlag" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "importJobId" TEXT,
    "flagType" "BusinessFlagType" NOT NULL,
    "severity" "FlagSeverity" NOT NULL,
    "reason" TEXT NOT NULL,
    "metadata" JSONB,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,

    CONSTRAINT "BusinessFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "County_slug_key" ON "County"("slug");

-- CreateIndex
CREATE INDEX "County_slug_idx" ON "County"("slug");

-- CreateIndex
CREATE INDEX "County_isActive_idx" ON "County"("isActive");

-- CreateIndex
CREATE INDEX "County_state_idx" ON "County"("state");

-- CreateIndex
CREATE INDEX "County_launchStatus_idx" ON "County"("launchStatus");

-- CreateIndex
CREATE INDEX "CountyLaunchLog_countyId_idx" ON "CountyLaunchLog"("countyId");

-- CreateIndex
CREATE INDEX "CountyLaunchLog_phase_idx" ON "CountyLaunchLog"("phase");

-- CreateIndex
CREATE INDEX "CountyLaunchLog_createdAt_idx" ON "CountyLaunchLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CountyDomain_domain_key" ON "CountyDomain"("domain");

-- CreateIndex
CREATE INDEX "CountyDomain_domain_idx" ON "CountyDomain"("domain");

-- CreateIndex
CREATE INDEX "CountyDomain_countyId_idx" ON "CountyDomain"("countyId");

-- CreateIndex
CREATE INDEX "CountyDomain_isActive_idx" ON "CountyDomain"("isActive");

-- CreateIndex
CREATE INDEX "City_countyId_idx" ON "City"("countyId");

-- CreateIndex
CREATE INDEX "City_isActive_idx" ON "City"("isActive");

-- CreateIndex
CREATE INDEX "City_displayOrder_idx" ON "City"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "City_countyId_slug_key" ON "City"("countyId", "slug");

-- CreateIndex
CREATE INDEX "AdminCountyAccess_adminId_idx" ON "AdminCountyAccess"("adminId");

-- CreateIndex
CREATE INDEX "AdminCountyAccess_countyId_idx" ON "AdminCountyAccess"("countyId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminCountyAccess_adminId_countyId_key" ON "AdminCountyAccess"("adminId", "countyId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCore_googlePlaceId_key" ON "BusinessCore"("googlePlaceId");

-- CreateIndex
CREATE INDEX "BusinessCore_latitude_longitude_idx" ON "BusinessCore"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "BusinessCore_claimState_idx" ON "BusinessCore"("claimState");

-- CreateIndex
CREATE INDEX "BusinessCore_lifecycleState_idx" ON "BusinessCore"("lifecycleState");

-- CreateIndex
CREATE INDEX "BusinessCore_source_idx" ON "BusinessCore"("source");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessCore_normalizedName_city_state_postalCode_key" ON "BusinessCore"("normalizedName", "city", "state", "postalCode");

-- CreateIndex
CREATE INDEX "BusinessImportLog_importBatchId_idx" ON "BusinessImportLog"("importBatchId");

-- CreateIndex
CREATE INDEX "BusinessImportLog_source_idx" ON "BusinessImportLog"("source");

-- CreateIndex
CREATE INDEX "BusinessImportLog_startedAt_idx" ON "BusinessImportLog"("startedAt");

-- CreateIndex
CREATE INDEX "BusinessAuditLog_businessId_idx" ON "BusinessAuditLog"("businessId");

-- CreateIndex
CREATE INDEX "BusinessAuditLog_changedAt_idx" ON "BusinessAuditLog"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_voucherId_key" ON "Purchase"("voucherId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_paymentIntentId_key" ON "Purchase"("paymentIntentId");

-- CreateIndex
CREATE INDEX "Purchase_countyId_idx" ON "Purchase"("countyId");

-- CreateIndex
CREATE INDEX "Purchase_userId_idx" ON "Purchase"("userId");

-- CreateIndex
CREATE INDEX "Purchase_dealId_idx" ON "Purchase"("dealId");

-- CreateIndex
CREATE INDEX "Purchase_voucherId_idx" ON "Purchase"("voucherId");

-- CreateIndex
CREATE INDEX "Purchase_paymentIntentId_idx" ON "Purchase"("paymentIntentId");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "Purchase_createdAt_idx" ON "Purchase"("createdAt");

-- CreateIndex
CREATE INDEX "AdminActionLog_countyId_idx" ON "AdminActionLog"("countyId");

-- CreateIndex
CREATE INDEX "AdminActionLog_adminUserId_idx" ON "AdminActionLog"("adminUserId");

-- CreateIndex
CREATE INDEX "AdminActionLog_actionType_idx" ON "AdminActionLog"("actionType");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetEntityType_idx" ON "AdminActionLog"("targetEntityType");

-- CreateIndex
CREATE INDEX "AdminActionLog_targetEntityId_idx" ON "AdminActionLog"("targetEntityId");

-- CreateIndex
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FounderStatus_businessId_key" ON "FounderStatus"("businessId");

-- CreateIndex
CREATE INDEX "FounderStatus_countyId_idx" ON "FounderStatus"("countyId");

-- CreateIndex
CREATE INDEX "FounderStatus_businessId_idx" ON "FounderStatus"("businessId");

-- CreateIndex
CREATE INDEX "FounderStatus_isActive_idx" ON "FounderStatus"("isActive");

-- CreateIndex
CREATE INDEX "FounderStatus_expiresAt_idx" ON "FounderStatus"("expiresAt");

-- CreateIndex
CREATE INDEX "FeaturedContent_countyId_idx" ON "FeaturedContent"("countyId");

-- CreateIndex
CREATE INDEX "FeaturedContent_entityType_idx" ON "FeaturedContent"("entityType");

-- CreateIndex
CREATE INDEX "FeaturedContent_entityId_idx" ON "FeaturedContent"("entityId");

-- CreateIndex
CREATE INDEX "FeaturedContent_isActive_idx" ON "FeaturedContent"("isActive");

-- CreateIndex
CREATE INDEX "FeaturedContent_startAt_endAt_idx" ON "FeaturedContent"("startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeaturedContent_countyId_entityType_entityId_isActive_key" ON "FeaturedContent"("countyId", "entityType", "entityId", "isActive");

-- CreateIndex
CREATE INDEX "AdminEscalation_countyId_idx" ON "AdminEscalation"("countyId");

-- CreateIndex
CREATE INDEX "AdminEscalation_escalationType_idx" ON "AdminEscalation"("escalationType");

-- CreateIndex
CREATE INDEX "AdminEscalation_severity_idx" ON "AdminEscalation"("severity");

-- CreateIndex
CREATE INDEX "AdminEscalation_entityType_idx" ON "AdminEscalation"("entityType");

-- CreateIndex
CREATE INDEX "AdminEscalation_entityId_idx" ON "AdminEscalation"("entityId");

-- CreateIndex
CREATE INDEX "AdminEscalation_resolved_idx" ON "AdminEscalation"("resolved");

-- CreateIndex
CREATE INDEX "AdminEscalation_createdAt_idx" ON "AdminEscalation"("createdAt");

-- CreateIndex
CREATE INDEX "BulkImportJob_countyId_idx" ON "BulkImportJob"("countyId");

-- CreateIndex
CREATE INDEX "BulkImportJob_cityId_idx" ON "BulkImportJob"("cityId");

-- CreateIndex
CREATE INDEX "BulkImportJob_status_idx" ON "BulkImportJob"("status");

-- CreateIndex
CREATE INDEX "BulkImportJob_createdAt_idx" ON "BulkImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "BusinessFlag_businessId_idx" ON "BusinessFlag"("businessId");

-- CreateIndex
CREATE INDEX "BusinessFlag_importJobId_idx" ON "BusinessFlag"("importJobId");

-- CreateIndex
CREATE INDEX "BusinessFlag_flagType_idx" ON "BusinessFlag"("flagType");

-- CreateIndex
CREATE INDEX "BusinessFlag_severity_idx" ON "BusinessFlag"("severity");

-- CreateIndex
CREATE INDEX "BusinessFlag_status_idx" ON "BusinessFlag"("status");

-- CreateIndex
CREATE INDEX "BusinessFlag_createdAt_idx" ON "BusinessFlag"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Business_externalPlaceId_key" ON "Business"("externalPlaceId");

-- CreateIndex
CREATE INDEX "Business_countyId_idx" ON "Business"("countyId");

-- CreateIndex
CREATE INDEX "Business_externalPlaceId_idx" ON "Business"("externalPlaceId");

-- CreateIndex
CREATE INDEX "Business_ingestionSource_idx" ON "Business"("ingestionSource");

-- CreateIndex
CREATE INDEX "Deal_countyId_idx" ON "Deal"("countyId");

-- CreateIndex
CREATE INDEX "Redemption_countyId_idx" ON "Redemption"("countyId");

-- CreateIndex
CREATE INDEX "Voucher_countyId_idx" ON "Voucher"("countyId");

-- CreateIndex
CREATE INDEX "VoucherValidation_countyId_idx" ON "VoucherValidation"("countyId");

-- AddForeignKey
ALTER TABLE "CountyLaunchLog" ADD CONSTRAINT "CountyLaunchLog_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CountyDomain" ADD CONSTRAINT "CountyDomain_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "City" ADD CONSTRAINT "City_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCountyAccess" ADD CONSTRAINT "AdminCountyAccess_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminCountyAccess" ADD CONSTRAINT "AdminCountyAccess_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessAuditLog" ADD CONSTRAINT "BusinessAuditLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "BusinessCore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Business" ADD CONSTRAINT "Business_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoucherValidation" ADD CONSTRAINT "VoucherValidation_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Voucher" ADD CONSTRAINT "Voucher_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Redemption" ADD CONSTRAINT "Redemption_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_voucherId_fkey" FOREIGN KEY ("voucherId") REFERENCES "Voucher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminActionLog" ADD CONSTRAINT "AdminActionLog_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderStatus" ADD CONSTRAINT "FounderStatus_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderStatus" ADD CONSTRAINT "FounderStatus_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderStatus" ADD CONSTRAINT "FounderStatus_grantedBy_fkey" FOREIGN KEY ("grantedBy") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderStatus" ADD CONSTRAINT "FounderStatus_removedBy_fkey" FOREIGN KEY ("removedBy") REFERENCES "UserIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedContent" ADD CONSTRAINT "FeaturedContent_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedContent" ADD CONSTRAINT "FeaturedContent_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedContent" ADD CONSTRAINT "FeaturedContent_removedBy_fkey" FOREIGN KEY ("removedBy") REFERENCES "UserIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEscalation" ADD CONSTRAINT "AdminEscalation_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminEscalation" ADD CONSTRAINT "AdminEscalation_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "UserIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BulkImportJob" ADD CONSTRAINT "BulkImportJob_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFlag" ADD CONSTRAINT "BusinessFlag_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFlag" ADD CONSTRAINT "BusinessFlag_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "BulkImportJob"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessFlag" ADD CONSTRAINT "BusinessFlag_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "UserIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
