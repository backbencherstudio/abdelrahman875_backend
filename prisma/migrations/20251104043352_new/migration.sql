-- CreateEnum
CREATE TYPE "StripeAccountStatus" AS ENUM ('inactive', 'pending', 'verified');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "stripe_account_status" "StripeAccountStatus" DEFAULT 'inactive',
ADD COLUMN     "stripe_connect_account_id" TEXT,
ADD COLUMN     "stripe_onboarding_completed" BOOLEAN DEFAULT false,
ADD COLUMN     "stripe_payouts_enabled" BOOLEAN DEFAULT false;
