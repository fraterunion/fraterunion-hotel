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

  async findAll(hotelId: string) {
    return this.prisma.roomType.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      include: {
        amenities: true,
        images: true,
      },
    });
  }

  async findOne(hotelId: string, id: string) {
    const roomType = await this.prisma.roomType.findFirst({
      where: { id, hotelId },
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

  async create(hotelId: string, dto: CreateRoomTypeDto) {
    const existing = await this.prisma.roomType.findUnique({
      where: {
        hotelId_slug: {
          hotelId,
          slug: dto.slug,
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

  async update(hotelId: string, id: string, dto: UpdateRoomTypeDto) {
    const existing = await this.prisma.roomType.findFirst({
      where: { id, hotelId },
    });

    if (!existing) {
      throw new NotFoundException('Room type not found');
    }

    if (dto.slug && dto.slug !== existing.slug) {
      const slugTaken = await this.prisma.roomType.findUnique({
        where: {
          hotelId_slug: {
            hotelId,
            slug: dto.slug,
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

  async remove(hotelId: string, id: string) {
    const existing = await this.prisma.roomType.findFirst({
      where: { id, hotelId },
    });

    if (!existing) {
      throw new NotFoundException('Room type not found');
    }

    return this.prisma.roomType.delete({
      where: { id },
    });
  }
}