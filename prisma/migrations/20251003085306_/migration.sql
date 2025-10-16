-- CreateEnum
CREATE TYPE "ShipmentType" AS ENUM ('FREIGHT', 'EXPRESS', 'URGENT', 'STANDARD', 'ECONOMY', 'PREMIUM');

-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "delivery_date" TIMESTAMP(3),
ADD COLUMN     "delivery_instructions" TEXT,
ADD COLUMN     "delivery_message" TEXT,
ADD COLUMN     "delivery_time" TEXT,
ADD COLUMN     "package_height" DOUBLE PRECISION,
ADD COLUMN     "package_length" DOUBLE PRECISION,
ADD COLUMN     "package_width" DOUBLE PRECISION,
ADD COLUMN     "pickup_instructions" TEXT,
ADD COLUMN     "shipment_type" "ShipmentType",
ADD COLUMN     "temperature_required" TEXT;
