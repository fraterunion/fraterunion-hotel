import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ReservationStatus, RoomStatus } from '@prisma/client';
import { SearchAvailabilityDto } from './dto/search-availability.dto';

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

        const availableCount = Math.max(totalRooms - overlappingReservations, 0);

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
}