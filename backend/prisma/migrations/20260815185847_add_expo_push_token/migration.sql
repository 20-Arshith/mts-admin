/*
  Warnings:

  - You are about to drop the column `approval_status` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `announcements` table. All the data in the column will be lost.
  - You are about to drop the column `approval_status` on the `reels` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `reels` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "vendor_availability" DROP CONSTRAINT "vendor_availability_vendor_id_fkey";

-- DropForeignKey
ALTER TABLE "vendors" DROP CONSTRAINT "vendors_agent_id_fkey";

-- DropIndex
DROP INDEX "announcements_location_active_approval_idx";

-- AlterTable
ALTER TABLE "announcements" DROP COLUMN "approval_status",
DROP COLUMN "status",
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "address" TEXT,
ADD COLUMN     "booking_date" TEXT,
ADD COLUMN     "booking_time" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "notifications" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "reels" DROP COLUMN "approval_status",
DROP COLUMN "status";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "expo_push_token" TEXT;

-- AlterTable
ALTER TABLE "vendor_availability" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "category_id" INTEGER;

-- CreateTable
CREATE TABLE "vendor_gallery" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_gallery_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("agent_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "service_categories"("category_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_availability" ADD CONSTRAINT "vendor_availability_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_gallery" ADD CONSTRAINT "vendor_gallery_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("vendor_id") ON DELETE RESTRICT ON UPDATE CASCADE;
