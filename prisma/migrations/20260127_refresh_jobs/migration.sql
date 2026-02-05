-- Create enums
DO $$ BEGIN
  CREATE TYPE "BusinessRefreshStatus" AS ENUM ('NOT_RUN','OK','INCOMPLETE','VERIFICATION_FAILED','MANUAL_REVIEW');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "RefreshJobStatus" AS ENUM ('PENDING','RUNNING','COMPLETED','FAILED','PAUSED');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE TYPE "RefreshOutcome" AS ENUM ('NOT_RUN','REFRESHED','UPDATED','UNCHANGED','INCOMPLETE','VERIFICATION_FAILED','MANUAL_REVIEW');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Add columns to Business
ALTER TABLE "Business"
  ADD COLUMN IF NOT EXISTS "rawGooglePayload" JSONB,
  ADD COLUMN IF NOT EXISTS "lastRefreshedAt" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "refreshStatus" "BusinessRefreshStatus" NOT NULL DEFAULT 'NOT_RUN',
  ADD COLUMN IF NOT EXISTS "refreshMissingFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "refreshNotes" TEXT;

-- Create RefreshJob table
CREATE TABLE IF NOT EXISTS "RefreshJob" (
  "id" TEXT PRIMARY KEY,
  "mode" TEXT NOT NULL,
  "filter" JSONB,
  "businessIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "status" "RefreshJobStatus" NOT NULL DEFAULT 'PENDING',
  "totalSelected" INTEGER NOT NULL DEFAULT 0,
  "refreshedCount" INTEGER NOT NULL DEFAULT 0,
  "updatedCount" INTEGER NOT NULL DEFAULT 0,
  "unchangedCount" INTEGER NOT NULL DEFAULT 0,
  "incompleteCount" INTEGER NOT NULL DEFAULT 0,
  "verificationFailedCount" INTEGER NOT NULL DEFAULT 0,
  "manualReviewCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP,
  "finishedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "adminId" TEXT,
  CONSTRAINT "RefreshJob_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "UserIdentity"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "RefreshJob_status_idx" ON "RefreshJob" ("status");
CREATE INDEX IF NOT EXISTS "RefreshJob_createdAt_idx" ON "RefreshJob" ("createdAt");

-- Create RefreshJobResult table
CREATE TABLE IF NOT EXISTS "RefreshJobResult" (
  "id" TEXT PRIMARY KEY,
  "jobId" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "outcome" "RefreshOutcome" NOT NULL DEFAULT 'NOT_RUN',
  "missingFields" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "verificationGaps" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "notes" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "refreshedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "RefreshJobResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RefreshJob"("id") ON DELETE CASCADE,
  CONSTRAINT "RefreshJobResult_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "RefreshJobResult_jobId_idx" ON "RefreshJobResult" ("jobId");
CREATE INDEX IF NOT EXISTS "RefreshJobResult_businessId_idx" ON "RefreshJobResult" ("businessId");
CREATE INDEX IF NOT EXISTS "RefreshJobResult_outcome_idx" ON "RefreshJobResult" ("outcome");
