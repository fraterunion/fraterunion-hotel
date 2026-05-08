-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "bot_checkout_follow_ups" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "whatsappFrom" TEXT NOT NULL,
    "guestFirstName" TEXT NOT NULL,
    "checkoutUrl" TEXT NOT NULL,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "lastSentAt" TIMESTAMP(3),
    "nextSendAt" TIMESTAMP(3) NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bot_checkout_follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_checkout_follow_ups_status_nextSendAt_idx" ON "bot_checkout_follow_ups"("status", "nextSendAt");

-- CreateIndex
CREATE INDEX "bot_checkout_follow_ups_reservationId_idx" ON "bot_checkout_follow_ups"("reservationId");

-- AddForeignKey
ALTER TABLE "bot_checkout_follow_ups" ADD CONSTRAINT "bot_checkout_follow_ups_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bot_checkout_follow_ups" ADD CONSTRAINT "bot_checkout_follow_ups_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
