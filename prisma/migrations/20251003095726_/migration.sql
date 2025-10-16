/*
  Warnings:

  - You are about to drop the column `delivery_signature` on the `missions` table. All the data in the column will be lost.
  - Added the required column `delivery_city` to the `missions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `delivery_postal_code` to the `missions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickup_city` to the `missions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickup_postal_code` to the `missions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickup_time` to the `missions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "missions" DROP COLUMN "delivery_signature",
ADD COLUMN     "carrier_signature" TEXT,
ADD COLUMN     "delivery_city" TEXT NOT NULL,
ADD COLUMN     "delivery_postal_code" TEXT NOT NULL,
ADD COLUMN     "loading_notes" TEXT,
ADD COLUMN     "other_goods_type" TEXT,
ADD COLUMN     "pickup_city" TEXT NOT NULL,
ADD COLUMN     "pickup_postal_code" TEXT NOT NULL,
ADD COLUMN     "pickup_time" TEXT NOT NULL;
