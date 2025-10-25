/*
  Warnings:

  - The values [FREIGHT,URGENT,STANDARD,ECONOMY,PREMIUM] on the enum `ShipmentType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ShipmentType_new" AS ENUM ('EXPRESS');
ALTER TABLE "missions" ALTER COLUMN "shipment_type" TYPE "ShipmentType_new" USING ("shipment_type"::text::"ShipmentType_new");
ALTER TYPE "ShipmentType" RENAME TO "ShipmentType_old";
ALTER TYPE "ShipmentType_new" RENAME TO "ShipmentType";
DROP TYPE "ShipmentType_old";
COMMIT;

-- AlterTable
ALTER TABLE "missions" ALTER COLUMN "shipment_type" SET DEFAULT 'EXPRESS';
