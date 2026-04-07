import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomStatus } from '@prisma/client';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, hotelId?: string | null) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    return this.prisma.room.findMany({
      where: {
        hotelId,
        hotel: {
          tenantId,
        },
      },
      orderBy: [{ roomNumber: 'asc' }],
      include: {
        roomType: true,
      },
    });
  }

  async findOne(tenantId: string, hotelId: string | null | undefined, id: string) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      include: {
        roomType: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    return room;
  }

  async create(
    tenantId: string,
    hotelId: string | null | undefined,
    dto: CreateRoomDto,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const hotel = await this.prisma.hotel.findFirst({
      where: {
        id: hotelId,
        tenantId,
      },
      select: { id: true },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found for tenant');
    }

    const roomType = await this.prisma.roomType.findFirst({
      where: {
        id: dto.roomTypeId,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      select: { id: true },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    const existing = await this.prisma.room.findFirst({
      where: {
        hotelId,
        roomNumber: dto.roomNumber,
        hotel: {
          tenantId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Room number already exists for this hotel');
    }

    return this.prisma.room.create({
      data: {
        hotelId,
        roomTypeId: dto.roomTypeId,
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        notes: dto.notes,
        status: RoomStatus.AVAILABLE,
      },
      include: {
        roomType: true,
      },
    });
  }

  async update(
    tenantId: string,
    hotelId: string | null | undefined,
    id: string,
    dto: UpdateRoomDto,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const existing = await this.prisma.room.findFirst({
      where: {
        id,
        hotelId,
        hotel: {
          tenantId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Room not found');
    }

    if (dto.roomTypeId) {
      const roomType = await this.prisma.roomType.findFirst({
        where: {
          id: dto.roomTypeId,
          hotelId,
          hotel: {
            tenantId,
          },
        },
        select: { id: true },
      });

      if (!roomType) {
        throw new NotFoundException('Room type not found');
      }
    }

    if (dto.roomNumber && dto.roomNumber !== existing.roomNumber) {
      const roomNumberTaken = await this.prisma.room.findFirst({
        where: {
          hotelId,
          roomNumber: dto.roomNumber,
          hotel: {
            tenantId,
          },
        },
      });

      if (roomNumberTaken) {
        throw new ConflictException('Room number already exists for this hotel');
      }
    }

    return this.prisma.room.update({
      where: { id },
      data: {
        roomTypeId: dto.roomTypeId,
        roomNumber: dto.roomNumber,
        floor: dto.floor,
        notes: dto.notes,
        status: dto.status as RoomStatus | undefined,
      },
      include: {
        roomType: true,
      },
    });
  }

  async remove(
    tenantId: string,
    hotelId: string | null | undefined,
    id: string,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const existing = await this.prisma.room.findFirst({
      where: {
        id,
        hotelId,
        hotel: {
          tenantId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Room not found');
    }

    return this.prisma.room.delete({
      where: { id },
    });
  }
}