import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

  getCatalog(hotelSlug: string) {
    return this.prisma.roomType.findMany({
      where: {
        hotel: { slug: hotelSlug },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'asc' },
      include: {
        amenities: { orderBy: { sortOrder: 'asc' } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
  }

  findBySlug(slug: string) {
    return this.prisma.hotel.findUnique({
      where: { slug },
      include: {
        settings: true,
        roomTypes: {
          include: {
            images: true,
            amenities: true,
          },
        },
      },
    });
  }
}