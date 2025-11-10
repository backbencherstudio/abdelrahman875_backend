/*
  Warnings:

  - You are about to drop the column `cmr_document_url` on the `missions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "missions" DROP COLUMN "cmr_document_url",
ADD COLUMN     "affreightment_document_url" TEXT;
