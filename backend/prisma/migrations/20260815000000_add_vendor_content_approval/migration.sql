ALTER TABLE "reels"
ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';

ALTER TABLE "announcements"
ADD COLUMN IF NOT EXISTS "approval_status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS "announcements_location_active_approval_idx"
ON "announcements" ("location_identifier", "is_active", "approval_status", "created_at");
