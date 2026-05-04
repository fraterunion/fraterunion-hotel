import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBlockDto } from './dto/create-block.dto';

@Injectable()
export class BlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, hotelId?: string | null, roomTypeId?: string) {
    if (!hotelId) throw new NotFoundException('Hotel context not found');

    return this.prisma.roomBlock.findMany({
      where: {
        hotelId,
        hotel: { tenantId },
        ...(roomTypeId ? { roomTypeId } : {}),
      },
      orderBy: { startDate: 'asc' },
      include: { roomType: { select: { id: true, name: true, slug: true } } },
    });
  }

  async create(tenantId: string, hotelId?: string | null, dto?: CreateBlockDto) {
    if (!hotelId) throw new NotFoundException('Hotel context not found');
    if (!dto) throw new BadRequestException('Body required');

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid dates');
    }
    if (endDate <= startDate) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const roomType = await this.prisma.roomType.findFirst({
      where: { id: dto.roomTypeId, hotelId, hotel: { tenantId } },
      select: { id: true },
    });
    if (!roomType) throw new NotFoundException('Room type not found');

    return this.prisma.roomBlock.create({
      data: {
        hotelId,
        roomTypeId: dto.roomTypeId,
        startDate,
        endDate,
        reason: dto.reason,
      },
      include: { roomType: { select: { id: true, name: true, slug: true } } },
    });
  }

  async remove(tenantId: string, hotelId?: string | null, id?: string) {
    if (!hotelId) throw new NotFoundException('Hotel context not found');

    const block = await this.prisma.roomBlock.findFirst({
      where: { id, hotelId, hotel: { tenantId } },
    });
    if (!block) throw new NotFoundException('Block not found');

    return this.prisma.roomBlock.delete({ where: { id: block.id } });
  }
}
