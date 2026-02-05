-- AlterTable
ALTER TABLE "BusinessCore" ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "BusinessCore_isFeatured_idx" ON "BusinessCore"("isFeatured");
