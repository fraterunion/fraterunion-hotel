import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReservationStatus, RoomStatus } from '@prisma/client';
import { SearchAvailabilityDto } from './dto/search-availability.dto';
import { GetCalendarDto } from './dto/get-calendar.dto';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async search(dto: SearchAvailabilityDto) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid dates');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { slug: dto.hotelSlug },
      select: {
        id: true,
        tenantId: true,
        name: true,
        slug: true,
        currency: true,
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const roomTypes = await this.prisma.roomType.findMany({
      where: {
        hotelId: hotel.id,
        hotel: {
          tenantId: hotel.tenantId,
        },
        status: 'ACTIVE',
      },
      orderBy: {
        createdAt: 'asc',
      },
      include: {
        images: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
        amenities: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
    });

    const activeReservationStatuses: ReservationStatus[] = [
      ReservationStatus.PENDING,
      ReservationStatus.CONFIRMED,
      ReservationStatus.CHECKED_IN,
    ];

    const availability = await Promise.all(
      roomTypes.map(async (roomType) => {
        const totalRooms = await this.prisma.room.count({
          where: {
            hotelId: hotel.id,
            roomTypeId: roomType.id,
            hotel: {
              tenantId: hotel.tenantId,
            },
            status: {
              not: RoomStatus.OUT_OF_SERVICE,
            },
          },
        });

        const overlappingReservations = await this.prisma.reservation.count({
          where: {
            hotelId: hotel.id,
            roomTypeId: roomType.id,
            hotel: {
              tenantId: hotel.tenantId,
            },
            status: {
              in: activeReservationStatuses,
            },
            checkInDate: {
              lt: checkOut,
            },
            checkOutDate: {
              gt: checkIn,
            },
          },
        });

        const blockCount = await this.prisma.roomBlock.count({
          where: {
            hotelId: hotel.id,
            roomTypeId: roomType.id,
            hotel: { tenantId: hotel.tenantId },
            startDate: { lt: checkOut },
            endDate: { gt: checkIn },
          },
        });

        const availableCount = blockCount > 0
          ? 0
          : Math.max(totalRooms - overlappingReservations, 0);

        return {
          id: roomType.id,
          name: roomType.name,
          slug: roomType.slug,
          description: roomType.description,
          basePrice: roomType.basePrice,
          capacityAdults: roomType.capacityAdults,
          capacityChildren: roomType.capacityChildren,
          bedType: roomType.bedType,
          sizeM2: roomType.sizeM2,
          images: roomType.images,
          amenities: roomType.amenities,
          inventory: {
            totalRooms,
            overlappingReservations,
            availableCount,
            isAvailable: availableCount > 0,
          },
        };
      }),
    );

    return {
      hotel,
      search: {
        checkInDate: dto.checkInDate,
        checkOutDate: dto.checkOutDate,
      },
      results: availability.filter((item) => item.inventory.availableCount > 0),
    };
  }

  async getCalendar(dto: GetCalendarDto) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { slug: dto.hotelSlug },
      select: { id: true, tenantId: true },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    const roomType = await this.prisma.roomType.findFirst({
      where: {
        slug: dto.roomTypeSlug,
        hotelId: hotel.id,
        hotel: { tenantId: hotel.tenantId },
      },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    const totalRooms = await this.prisma.room.count({
      where: {
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        hotel: { tenantId: hotel.tenantId },
        status: { not: RoomStatus.OUT_OF_SERVICE },
      },
    });

    const daysInMonth = new Date(Date.UTC(dto.year, dto.month, 0)).getUTCDate();

    if (totalRooms === 0) {
      const blockedNights: string[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        blockedNights.push(
          `${dto.year}-${String(dto.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        );
      }
      return { blockedNights };
    }

    const monthStart = new Date(Date.UTC(dto.year, dto.month - 1, 1));
    const monthEnd = new Date(Date.UTC(dto.year, dto.month, 1));

    const reservations = await this.prisma.reservation.findMany({
      where: {
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        hotel: { tenantId: hotel.tenantId },
        status: {
          in: [
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
            ReservationStatus.CHECKED_IN,
          ],
        },
        checkInDate: { lt: monthEnd },
        checkOutDate: { gt: monthStart },
      },
      select: { checkInDate: true, checkOutDate: true },
    });

    const blocks = await this.prisma.roomBlock.findMany({
      where: {
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        hotel: { tenantId: hotel.tenantId },
        startDate: { lt: monthEnd },
        endDate: { gt: monthStart },
      },
      select: { startDate: true, endDate: true },
    });

    const blockedNights: string[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const nightStart = new Date(Date.UTC(dto.year, dto.month - 1, d));
      const nightEnd = new Date(Date.UTC(dto.year, dto.month - 1, d + 1));
      const overlapping = reservations.filter(
        (r) => r.checkInDate < nightEnd && r.checkOutDate > nightStart,
      ).length;
      const isManuallyBlocked = blocks.some(
        (b) => b.startDate < nightEnd && b.endDate > nightStart,
      );
      if (overlapping >= totalRooms || isManuallyBlocked) {
        blockedNights.push(
          `${dto.year}-${String(dto.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        );
      }
    }

    return { blockedNights };
  }
}