/*
  Warnings:

  - Made the column `delivery_contact_name` on table `missions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `delivery_contact_phone` on table `missions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pickup_contact_name` on table `missions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `pickup_contact_phone` on table `missions` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "missions" ALTER COLUMN "delivery_contact_name" SET NOT NULL,
ALTER COLUMN "delivery_contact_phone" SET NOT NULL,
ALTER COLUMN "pickup_contact_name" SET NOT NULL,
ALTER COLUMN "pickup_contact_phone" SET NOT NULL;
