-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "checkout_session_id" TEXT,
ADD COLUMN     "checkout_url" TEXT,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "session_expires_at" TIMESTAMP(3);
