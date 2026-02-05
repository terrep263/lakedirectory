-- Add Business Directory and Profile Fields
-- All fields are nullable for backward compatibility with existing records

-- Public Identity & Routing
ALTER TABLE "Business" ADD COLUMN "slug" TEXT;
CREATE UNIQUE INDEX "Business_slug_key" ON "Business"("slug");

-- Business Description & Category
ALTER TABLE "Business" ADD COLUMN "description" TEXT;
ALTER TABLE "Business" ADD COLUMN "category" TEXT;
CREATE INDEX "Business_category_idx" ON "Business"("category");

-- Location & Contact
ALTER TABLE "Business" ADD COLUMN "address" TEXT;
ALTER TABLE "Business" ADD COLUMN "city" TEXT;
ALTER TABLE "Business" ADD COLUMN "state" TEXT;
ALTER TABLE "Business" ADD COLUMN "zipCode" TEXT;
CREATE INDEX "Business_city_state_idx" ON "Business"("city", "state");
ALTER TABLE "Business" ADD COLUMN "phone" TEXT;
ALTER TABLE "Business" ADD COLUMN "website" TEXT;

-- Media
ALTER TABLE "Business" ADD COLUMN "logoUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN "coverUrl" TEXT;
ALTER TABLE "Business" ADD COLUMN "photos" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Operations
ALTER TABLE "Business" ADD COLUMN "hours" JSONB;
