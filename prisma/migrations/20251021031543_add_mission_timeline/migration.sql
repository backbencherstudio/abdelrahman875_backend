-- CreateTable
CREATE TABLE "mission_timelines" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event" "MissionStatus" NOT NULL,
    "description" TEXT,
    "user_id" TEXT,
    "mission_id" TEXT NOT NULL,

    CONSTRAINT "mission_timelines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "mission_timelines" ADD CONSTRAINT "mission_timelines_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_timelines" ADD CONSTRAINT "mission_timelines_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
