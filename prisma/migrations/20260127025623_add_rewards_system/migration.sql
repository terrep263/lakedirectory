-- CreateEnum
CREATE TYPE "RewardEventType" AS ENUM ('SHARE', 'REFERRAL', 'PURCHASE', 'SIGNUP', 'OTHER');

-- AlterTable
ALTER TABLE "UserIdentity" ADD COLUMN     "rewardBalance" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RewardEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "countyId" TEXT,

    CONSTRAINT "RewardEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RewardEvent_countyId_idx" ON "RewardEvent"("countyId");

-- CreateIndex
CREATE INDEX "RewardEvent_userId_idx" ON "RewardEvent"("userId");

-- CreateIndex
CREATE INDEX "RewardEvent_eventType_idx" ON "RewardEvent"("eventType");

-- CreateIndex
CREATE INDEX "RewardEvent_createdAt_idx" ON "RewardEvent"("createdAt");

-- AddForeignKey
ALTER TABLE "RewardEvent" ADD CONSTRAINT "RewardEvent_countyId_fkey" FOREIGN KEY ("countyId") REFERENCES "County"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardEvent" ADD CONSTRAINT "RewardEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
