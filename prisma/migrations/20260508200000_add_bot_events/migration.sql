-- CreateEnum
CREATE TYPE "BotEventType" AS ENUM ('CONVERSATION_STARTED', 'DATES_PROVIDED', 'AVAILABILITY_SHOWN', 'CABIN_INFO_VIEWED', 'CABIN_SELECTED', 'CHECKOUT_STARTED', 'PEOPLE_PROVIDED', 'EMAIL_PROVIDED', 'CHECKOUT_LINK_GENERATED', 'FOLLOWUP_SENT', 'PAYMENT_COMPLETED');

-- CreateTable
CREATE TABLE "bot_events" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hotelId" TEXT NOT NULL,
    "whatsappFrom" TEXT,
    "eventType" "BotEventType" NOT NULL,
    "sessionId" TEXT,
    "roomTypeId" TEXT,
    "reservationId" TEXT,
    "metadata" JSONB,

    CONSTRAINT "bot_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bot_events_hotelId_createdAt_idx" ON "bot_events"("hotelId", "createdAt");

-- CreateIndex
CREATE INDEX "bot_events_eventType_createdAt_idx" ON "bot_events"("eventType", "createdAt");

-- AddForeignKey
ALTER TABLE "bot_events" ADD CONSTRAINT "bot_events_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;
