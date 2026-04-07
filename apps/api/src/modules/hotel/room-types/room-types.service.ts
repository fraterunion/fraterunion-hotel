import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomTypeStatus } from '@prisma/client';

@Injectable()
export class RoomTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, hotelId?: string | null) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    return this.prisma.roomType.findMany({
      where: {
        hotelId,
        hotel: {
          tenantId,
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        amenities: true,
        images: true,
      },
    });
  }

  async findOne(tenantId: string, hotelId: string | null | undefined, id: string) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const roomType = await this.prisma.roomType.findFirst({
      where: {
        id,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      include: {
        amenities: true,
        images: true,
      },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    return roomType;
  }

  async create(
    tenantId: string,
    hotelId: string | null | undefined,
    dto: CreateRoomTypeDto,
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

    const existing = await this.prisma.roomType.findFirst({
      where: {
        hotelId,
        slug: dto.slug,
        hotel: {
          tenantId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Slug already exists for this hotel');
    }

    return this.prisma.roomType.create({
      data: {
        hotelId,
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        basePrice: dto.basePrice,
        capacityAdults: dto.capacityAdults,
        capacityChildren: dto.capacityChildren,
        bedType: dto.bedType,
        sizeM2: dto.sizeM2,
        status: RoomTypeStatus.ACTIVE,
      },
    });
  }

  async update(
    tenantId: string,
    hotelId: string | null | undefined,
    id: string,
    dto: UpdateRoomTypeDto,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const existing = await this.prisma.roomType.findFirst({
      where: {
        id,
        hotelId,
        hotel: {
          tenantId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Room type not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugTaken = await this.prisma.roomType.findFirst({
        where: {
          hotelId,
          slug: dto.slug,
          hotel: {
            tenantId,
          },
        },
      });

      if (slugTaken) {
        throw new ConflictException('Slug already exists for this hotel');
      }
    }

    return this.prisma.roomType.update({
      where: { id },
      data: {
        name: dto.name,
        slug: dto.slug,
        description: dto.description,
        basePrice: dto.basePrice,
        capacityAdults: dto.capacityAdults,
        capacityChildren: dto.capacityChildren,
        bedType: dto.bedType,
        sizeM2: dto.sizeM2,
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

    const existing = await this.prisma.roomType.findFirst({
      where: {
        id,
        hotelId,
        hotel: {
          tenantId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Room type not found');
    }

    return this.prisma.roomType.delete({
      where: { id },
    });
  }
}