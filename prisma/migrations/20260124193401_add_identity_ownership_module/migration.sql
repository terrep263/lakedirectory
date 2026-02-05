-- CreateEnum
CREATE TYPE "IdentityRole" AS ENUM ('USER', 'VENDOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "IdentityStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "UserIdentity" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "IdentityRole" NOT NULL,
    "status" "IdentityStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorOwnership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VendorOwnership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserIdentity_email_key" ON "UserIdentity"("email");

-- CreateIndex
CREATE INDEX "UserIdentity_email_idx" ON "UserIdentity"("email");

-- CreateIndex
CREATE INDEX "UserIdentity_role_idx" ON "UserIdentity"("role");

-- CreateIndex
CREATE INDEX "UserIdentity_status_idx" ON "UserIdentity"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorOwnership_userId_key" ON "VendorOwnership"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorOwnership_businessId_key" ON "VendorOwnership"("businessId");

-- CreateIndex
CREATE INDEX "VendorOwnership_userId_idx" ON "VendorOwnership"("userId");

-- CreateIndex
CREATE INDEX "VendorOwnership_businessId_idx" ON "VendorOwnership"("businessId");

-- AddForeignKey
ALTER TABLE "VendorOwnership" ADD CONSTRAINT "VendorOwnership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorOwnership" ADD CONSTRAINT "VendorOwnership_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
