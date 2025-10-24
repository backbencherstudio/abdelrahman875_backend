/*
  Warnings:

  - The values [PROCESSING] on the enum `PaymentStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "PaymentStatus_new" AS ENUM ('PENDING', 'HELD_IN_ESCROW', 'RELEASED', 'COMPLETED', 'FAILED', 'REFUNDED', 'DISPUTED');
ALTER TABLE "payments" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "payments" ALTER COLUMN "status" TYPE "PaymentStatus_new" USING ("status"::text::"PaymentStatus_new");
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
ALTER TYPE "PaymentStatus_new" RENAME TO "PaymentStatus";
DROP TYPE "PaymentStatus_old";
ALTER TABLE "payments" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "escrow_hold_until" TIMESTAMP(3),
ADD COLUMN     "released_at" TIMESTAMP(3);
