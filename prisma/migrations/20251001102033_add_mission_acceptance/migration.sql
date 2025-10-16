-- CreateEnum
CREATE TYPE "UserApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('ID_CARD', 'KBIS', 'INSURANCE_CERTIFICATE', 'RIB', 'DRIVING_LICENSE', 'PROFILE_PHOTO', 'URSSAF_CERTIFICATE', 'TRANSPORT_LICENSE', 'SEPA_MANDATE', 'PROFESSIONAL_LIABILITY_INSURANCE');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('CAR', 'TRUCK', 'VAN', 'MOTORBIKE', 'BICYCLE');

-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('CREATED', 'PAYMENT_PENDING', 'PAYMENT_CONFIRMED', 'SEARCHING_CARRIER', 'ACCEPTED', 'PICKUP_CONFIRMED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'DISPUTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "application_rejected_at" TIMESTAMP(3),
ADD COLUMN     "application_rejection_reason" TEXT,
ADD COLUMN     "application_status" "UserApplicationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "application_submitted_at" TIMESTAMP(3),
ADD COLUMN     "average_rating" DOUBLE PRECISION DEFAULT 0.0,
ADD COLUMN     "completed_missions" INTEGER DEFAULT 0,
ADD COLUMN     "total_reviews" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_name" TEXT,
    "company_number" TEXT,
    "vat_number" TEXT,
    "legal_form" TEXT,
    "description" TEXT,
    "years_experience" INTEGER,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_name" TEXT,
    "file_size" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "expires_at" TIMESTAMP(3),
    "user_id" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "VehicleType" NOT NULL,
    "make" TEXT,
    "model" TEXT,
    "year" INTEGER,
    "license_plate" TEXT NOT NULL,
    "color" TEXT,
    "capacity_kg" DOUBLE PRECISION,
    "capacity_m3" DOUBLE PRECISION,
    "photos" TEXT[],
    "carrier_id" TEXT NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "missions" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pickup_address" TEXT NOT NULL,
    "pickup_lat" DOUBLE PRECISION,
    "pickup_lng" DOUBLE PRECISION,
    "delivery_address" TEXT NOT NULL,
    "delivery_lat" DOUBLE PRECISION,
    "delivery_lng" DOUBLE PRECISION,
    "goods_type" TEXT NOT NULL,
    "parcels_count" INTEGER NOT NULL,
    "weight_kg" DOUBLE PRECISION NOT NULL,
    "volume_m3" DOUBLE PRECISION NOT NULL,
    "special_instructions" TEXT,
    "fragile" BOOLEAN DEFAULT false,
    "pickup_date" TIMESTAMP(3) NOT NULL,
    "time_slot" TEXT NOT NULL,
    "estimated_duration" INTEGER,
    "distance_km" DOUBLE PRECISION NOT NULL,
    "base_price" DOUBLE PRECISION NOT NULL,
    "final_price" DOUBLE PRECISION NOT NULL,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "commission_amount" DOUBLE PRECISION,
    "status" "MissionStatus" NOT NULL DEFAULT 'CREATED',
    "cmr_document_url" TEXT,
    "confirmation_document_url" TEXT,
    "invoice_document_url" TEXT,
    "pickup_photo" TEXT,
    "pickup_signature" TEXT,
    "delivery_photo" TEXT,
    "delivery_signature" TEXT,
    "recipient_signature" TEXT,
    "delivery_notes" TEXT,
    "shipper_id" TEXT NOT NULL,
    "carrier_id" TEXT,

    CONSTRAINT "missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_acceptances" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "mission_id" TEXT NOT NULL,
    "carrier_id" TEXT NOT NULL,

    CONSTRAINT "mission_acceptances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tracking_points" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "mission_id" TEXT NOT NULL,

    CONSTRAINT "tracking_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_reviews" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "author_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "mission_id" TEXT NOT NULL,

    CONSTRAINT "mission_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT,
    "provider_id" TEXT,
    "commission_rate" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "commission_amount" DOUBLE PRECISION,
    "payout_date" TIMESTAMP(3),
    "mission_id" TEXT NOT NULL,
    "shipper_id" TEXT NOT NULL,
    "carrier_id" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_profiles_user_id_key" ON "user_profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "documents_user_id_type_key" ON "documents"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_license_plate_key" ON "vehicles"("license_plate");

-- CreateIndex
CREATE UNIQUE INDEX "mission_acceptances_mission_id_carrier_id_key" ON "mission_acceptances"("mission_id", "carrier_id");

-- CreateIndex
CREATE UNIQUE INDEX "mission_reviews_author_id_mission_id_key" ON "mission_reviews"("author_id", "mission_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_mission_id_key" ON "payments"("mission_id");

-- AddForeignKey
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_shipper_id_fkey" FOREIGN KEY ("shipper_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missions" ADD CONSTRAINT "missions_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_acceptances" ADD CONSTRAINT "mission_acceptances_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_acceptances" ADD CONSTRAINT "mission_acceptances_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tracking_points" ADD CONSTRAINT "tracking_points_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_reviews" ADD CONSTRAINT "mission_reviews_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_reviews" ADD CONSTRAINT "mission_reviews_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_reviews" ADD CONSTRAINT "mission_reviews_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_mission_id_fkey" FOREIGN KEY ("mission_id") REFERENCES "missions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_shipper_id_fkey" FOREIGN KEY ("shipper_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_carrier_id_fkey" FOREIGN KEY ("carrier_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
