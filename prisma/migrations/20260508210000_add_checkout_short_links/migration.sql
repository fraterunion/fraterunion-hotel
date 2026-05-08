-- CreateTable
CREATE TABLE "checkout_short_links" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "code" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "reservationId" TEXT,
    "paymentId" TEXT,
    "stripeUrl" TEXT NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "lastClickedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "checkout_short_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "checkout_short_links_code_key" ON "checkout_short_links"("code");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_short_links_reservationId_key" ON "checkout_short_links"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "checkout_short_links_paymentId_key" ON "checkout_short_links"("paymentId");

-- CreateIndex
CREATE INDEX "checkout_short_links_hotelId_createdAt_idx" ON "checkout_short_links"("hotelId", "createdAt");

-- AddForeignKey
ALTER TABLE "checkout_short_links" ADD CONSTRAINT "checkout_short_links_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_short_links" ADD CONSTRAINT "checkout_short_links_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkout_short_links" ADD CONSTRAINT "checkout_short_links_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
