import {
  BadRequestException,
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
        images: { orderBy: { sortOrder: 'asc' } },
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
        images: { orderBy: { sortOrder: 'asc' } },
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
        lowOccupancyPrice: dto.lowOccupancyPrice ?? undefined,
        lowOccupancyThreshold: dto.lowOccupancyThreshold ?? undefined,
        capacityAdults: dto.capacityAdults,
        capacityChildren: dto.capacityChildren,
        bedType: dto.bedType,
        sizeM2: dto.sizeM2,
        status: dto.status,
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

  async addImage(
    tenantId: string,
    hotelId: string | null | undefined,
    roomTypeId: string,
    dto: { url: string; altText?: string },
  ) {
    if (!hotelId) throw new NotFoundException('Hotel context not found');

    const roomType = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, hotelId, hotel: { tenantId } },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    const agg = await this.prisma.roomTypeImage.aggregate({
      where: { roomTypeId },
      _max: { sortOrder: true },
    });
    const sortOrder = (agg._max.sortOrder ?? -1) + 1;

    return this.prisma.roomTypeImage.create({
      data: {
        roomTypeId,
        url: dto.url,
        altText: dto.altText ?? null,
        sortOrder,
      },
    });
  }

  async removeImage(
    tenantId: string,
    hotelId: string | null | undefined,
    roomTypeId: string,
    imageId: string,
  ) {
    if (!hotelId) throw new NotFoundException('Hotel context not found');

    const image = await this.prisma.roomTypeImage.findFirst({
      where: {
        id: imageId,
        roomTypeId,
        roomType: { hotelId, hotel: { tenantId } },
      },
      select: { id: true },
    });
    if (!image) throw new NotFoundException('Image not found');

    return this.prisma.roomTypeImage.delete({ where: { id: imageId } });
  }

  async reorderImages(
    tenantId: string,
    hotelId: string | null | undefined,
    roomTypeId: string,
    imageIds: string[],
  ) {
    if (!hotelId) throw new NotFoundException('Hotel context not found');

    const roomType = await this.prisma.roomType.findFirst({
      where: { id: roomTypeId, hotelId, hotel: { tenantId } },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    const existing = await this.prisma.roomTypeImage.findMany({
      where: { roomTypeId },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((i) => i.id));
    if (imageIds.some((id) => !existingIds.has(id))) {
      throw new BadRequestException('One or more image IDs not found');
    }

    await this.prisma.$transaction(
      imageIds.map((id, index) =>
        this.prisma.roomTypeImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );

    return this.prisma.roomTypeImage.findMany({
      where: { roomTypeId },
      orderBy: { sortOrder: 'asc' },
    });
  }
}