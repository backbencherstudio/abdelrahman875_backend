-- AlterTable
ALTER TABLE "missions" ADD COLUMN     "temperature_id" TEXT;

-- CreateTable
CREATE TABLE "temperatures" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "min_celsius" DOUBLE PRECISION,
    "max_celsius" DOUBLE PRECISION,
    "description" TEXT,

    CONSTRAINT "temperatures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "temperatures_name_key" ON "temperatures"("name");

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_temperature_id_fkey" FOREIGN KEY ("temperature_id") REFERENCES "temperatures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
