-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "featuredAt" TIMESTAMP(3),
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Business_isFeatured_idx" ON "Business"("isFeatured");

-- CreateIndex
CREATE INDEX "Business_featuredAt_idx" ON "Business"("featuredAt");
