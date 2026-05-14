-- CreateTable
CREATE TABLE IF NOT EXISTS "EventLandingPage" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "styleHint" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventLandingPage_pkey" PRIMARY KEY ("id")
);

-- Existing development databases may already have the old one-page table from db push.
ALTER TABLE "EventLandingPage" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "EventLandingPage" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "EventLandingPage" ALTER COLUMN "version" DROP DEFAULT;

-- Replace the old one-page-per-event constraint with versioned uniqueness.
DROP INDEX IF EXISTS "EventLandingPage_eventId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "EventLandingPage_eventId_version_key" ON "EventLandingPage"("eventId", "version");
CREATE INDEX IF NOT EXISTS "EventLandingPage_eventId_idx" ON "EventLandingPage"("eventId");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'EventLandingPage_eventId_fkey'
    ) THEN
        ALTER TABLE "EventLandingPage"
        ADD CONSTRAINT "EventLandingPage_eventId_fkey"
        FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
