CREATE TABLE IF NOT EXISTS "announcements" (
    "announcement_id" SERIAL NOT NULL,
    "vendor_id" INTEGER,
    "message" TEXT NOT NULL,
    "image_url" TEXT,
    "location_identifier" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("announcement_id")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'announcements_vendor_id_fkey'
          AND table_name = 'announcements'
    ) THEN
        ALTER TABLE "announcements"
        ADD CONSTRAINT "announcements_vendor_id_fkey"
        FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS "announcements_location_identifier_is_active_created_at_idx"
ON "announcements"("location_identifier", "is_active", "created_at");
