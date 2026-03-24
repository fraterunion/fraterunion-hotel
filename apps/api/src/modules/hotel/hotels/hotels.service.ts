import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class HotelsService {
  constructor(private readonly prisma: PrismaService) {}

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