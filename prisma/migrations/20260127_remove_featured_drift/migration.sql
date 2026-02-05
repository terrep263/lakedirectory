-- SCHEMA RESOLUTION: Remove featured status drift from Business and BusinessCore
-- Featured status MUST exist ONLY in BusinessPage table

-- Remove index on Business.isFeatured
DROP INDEX IF EXISTS "Business_isFeatured_idx";

-- Remove index on Business.featuredAt
DROP INDEX IF EXISTS "Business_featuredAt_idx";

-- Remove index on BusinessCore.isFeatured
DROP INDEX IF EXISTS "BusinessCore_isFeatured_idx";

-- Remove isFeatured and featuredAt from Business table
ALTER TABLE "Business" DROP COLUMN IF EXISTS "isFeatured";
ALTER TABLE "Business" DROP COLUMN IF EXISTS "featuredAt";

-- Remove isFeatured from BusinessCore table
ALTER TABLE "BusinessCore" DROP COLUMN IF EXISTS "isFeatured";
