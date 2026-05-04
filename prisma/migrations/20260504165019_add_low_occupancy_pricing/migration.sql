-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "lowOccupancyPrice" DECIMAL(10,2),
ADD COLUMN     "lowOccupancyThreshold" INTEGER;
