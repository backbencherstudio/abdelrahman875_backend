/*
  Warnings:

  - You are about to drop the column `other_goods_type` on the `missions` table. All the data in the column will be lost.
  - The `temperature_required` column on the `missions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TemperatureRange" AS ENUM ('FROZEN', 'REFRIGERATED', 'AMBIENT', 'CONTROLLED', 'OTHER');

-- AlterTable
ALTER TABLE "missions" DROP COLUMN "other_goods_type",
ADD COLUMN     "vat_amount" DOUBLE PRECISION,
ALTER COLUMN "parcels_count" DROP NOT NULL,
ALTER COLUMN "time_slot" DROP NOT NULL,
DROP COLUMN "temperature_required",
ADD COLUMN     "temperature_required" "TemperatureRange";
