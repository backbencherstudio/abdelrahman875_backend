-- CreateEnum
CREATE TYPE "MissionDocumentType" AS ENUM ('FREIGHT', 'CMR', 'INVOICE');

-- CreateTable
CREATE TABLE "MissionDocuments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "document_type" "MissionDocumentType" NOT NULL,
    "document_url" TEXT,
    "mission_id" TEXT,
    "user_id" TEXT,

    CONSTRAINT "MissionDocuments_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MissionDocuments" ADD CONSTRAINT "MissionDocuments_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionDocuments" ADD CONSTRAINT "MissionDocuments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
