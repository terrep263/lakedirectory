-- CreateTable
CREATE TABLE "BusinessPage" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "heroImageUrl" TEXT,
    "locationText" TEXT,
    "aiDescription" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPage_businessId_key" ON "BusinessPage"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "BusinessPage_slug_key" ON "BusinessPage"("slug");

-- CreateIndex
CREATE INDEX "BusinessPage_businessId_idx" ON "BusinessPage"("businessId");

-- CreateIndex
CREATE INDEX "BusinessPage_slug_idx" ON "BusinessPage"("slug");

-- CreateIndex
CREATE INDEX "BusinessPage_isPublished_idx" ON "BusinessPage"("isPublished");

-- CreateIndex
CREATE INDEX "BusinessPage_isFeatured_idx" ON "BusinessPage"("isFeatured");

-- CreateIndex
CREATE INDEX "BusinessPage_featuredAt_idx" ON "BusinessPage"("featuredAt");

-- AddForeignKey
ALTER TABLE "BusinessPage" ADD CONSTRAINT "BusinessPage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
