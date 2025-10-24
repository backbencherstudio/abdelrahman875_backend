/*
  Warnings:

  - You are about to drop the column `temperature_id` on the `missions` table. All the data in the column will be lost.
  - You are about to drop the `temperatures` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "TemperatureUnit" AS ENUM ('CELSIUS', 'FAHRENHEIT');

-- DropForeignKey
ALTER TABLE "missions" DROP CONSTRAINT "missions_temperature_id_fkey";

-- AlterTable
ALTER TABLE "missions" DROP COLUMN "temperature_id",
ADD COLUMN     "tem_unit" "TemperatureUnit" NOT NULL DEFAULT 'CELSIUS',
ADD COLUMN     "temp_max" DOUBLE PRECISION,
ADD COLUMN     "temp_min" DOUBLE PRECISION;

-- DropTable
DROP TABLE "temperatures";

-- DropEnum
DROP TYPE "TemperatureRange";
