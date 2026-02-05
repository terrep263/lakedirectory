-- DropForeignKey
ALTER TABLE IF EXISTS "RefreshJob" DROP CONSTRAINT IF EXISTS "RefreshJob_adminId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "RefreshJobResult" DROP CONSTRAINT IF EXISTS "RefreshJobResult_businessId_fkey";

-- DropForeignKey
ALTER TABLE IF EXISTS "RefreshJobResult" DROP CONSTRAINT IF EXISTS "RefreshJobResult_jobId_fkey";

-- AlterTable
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Business'
      AND column_name = 'lastRefreshedAt'
  ) THEN
    EXECUTE 'ALTER TABLE "Business" ALTER COLUMN "lastRefreshedAt" SET DATA TYPE TIMESTAMP(3)';
  END IF;
END $$;

-- AlterTable
DO $$ BEGIN
  IF to_regclass('public.\"RefreshJob\"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "RefreshJob" ALTER COLUMN "startedAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "finishedAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3)';
  END IF;
END $$;

-- AlterTable
DO $$ BEGIN
  IF to_regclass('public.\"RefreshJobResult\"') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "RefreshJobResult" ALTER COLUMN "refreshedAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3)';
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE IF EXISTS "RefreshJob" ADD CONSTRAINT "RefreshJob_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "UserIdentity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "RefreshJobResult" ADD CONSTRAINT "RefreshJobResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RefreshJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE IF EXISTS "RefreshJobResult" ADD CONSTRAINT "RefreshJobResult_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
