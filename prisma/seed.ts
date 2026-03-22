import { PrismaClient, FeeType, HotelStatus, PaymentProvider, PaymentRecordStatus, PaymentStatus, ReservationSource, ReservationStatus, RoomStatus, RoomTypeStatus, UserRole, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);

  const hotel = await prisma.hotel.upsert({
    where: { slug: 'casa-frater-hotel' },
    update: {},
    create: {
      name: 'Casa Frater Hotel',
      slug: 'casa-frater-hotel',
      legalName: 'Casa Frater Hotel SA de CV',
      email: 'hello@casafrater.com',
      phone: '+52 55 0000 0000',
      timezone: 'America/Mexico_City',
      currency: 'MXN',
      status: HotelStatus.ACTIVE,
      settings: {
        create: {
          heroTitle: 'Boutique luxury in the heart of the city',
          heroSubtitle: 'Reserve directly with the best rate.',
          aboutText: 'Casa Frater Hotel is the demo property for FraterUnion Hotel V1.',
          city: 'Ciudad de México',
          country: 'México',
          addressLine1: 'Av. Reforma 100',
          checkInTime: '15:00',
          checkOutTime: '12:00',
          taxPercentage: 16,
          serviceFeeType: FeeType.FIXED,
          serviceFeeValue: 99,
          cancellationPolicy: 'Free cancellation up to 48 hours before check-in.',
          contactEmail: 'hello@casafrater.com',
          contactPhone: '+52 55 0000 0000'
        }
      }
    },
    include: { settings: true }
  });

  await prisma.user.upsert({
    where: { email: 'admin@casafrater.com' },
    update: {},
    create: {
      hotelId: hotel.id,
      firstName: 'Casa',
      lastName: 'Admin',
      email: 'admin@casafrater.com',
      passwordHash,
      role: UserRole.HOTEL_ADMIN,
      status: UserStatus.ACTIVE
    }
  });

  const standard = await prisma.roomType.upsert({
    where: { hotelId_slug: { hotelId: hotel.id, slug: 'standard-queen' } },
    update: {},
    create: {
      hotelId: hotel.id,
      name: 'Standard Queen',
      slug: 'standard-queen',
      description: 'Comfortable room with queen bed and city view.',
      basePrice: 2200,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: 'Queen',
      sizeM2: 28,
      status: RoomTypeStatus.ACTIVE,
      amenities: { create: [{ name: 'Wi‑Fi', sortOrder: 1 }, { name: 'Air Conditioning', sortOrder: 2 }, { name: 'Smart TV', sortOrder: 3 }] },
      images: { create: [{ url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945', altText: 'Standard room', sortOrder: 1 }] }
    }
  });
  const deluxe = await prisma.roomType.upsert({ where: { hotelId_slug: { hotelId: hotel.id, slug: 'deluxe-king' } }, update: {}, create: { hotelId: hotel.id, name: 'Deluxe King', slug: 'deluxe-king', description: 'Spacious deluxe room with king bed and lounge area.', basePrice: 3200, capacityAdults: 2, capacityChildren: 1, bedType: 'King', sizeM2: 36, status: RoomTypeStatus.ACTIVE } });
  const suite = await prisma.roomType.upsert({ where: { hotelId_slug: { hotelId: hotel.id, slug: 'junior-suite' } }, update: {}, create: { hotelId: hotel.id, name: 'Junior Suite', slug: 'junior-suite', description: 'Premium suite with sitting area and balcony.', basePrice: 4800, capacityAdults: 3, capacityChildren: 2, bedType: 'King', sizeM2: 52, status: RoomTypeStatus.ACTIVE } });

  const roomSeeds = [['101', standard.id],['102', standard.id],['103', standard.id],['201', deluxe.id],['202', deluxe.id],['301', suite.id]];
  for (const [roomNumber, roomTypeId] of roomSeeds) {
    await prisma.room.upsert({ where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber } }, update: {}, create: { hotelId: hotel.id, roomTypeId, roomNumber, status: RoomStatus.AVAILABLE } });
  }

  const guest = await prisma.guest.create({ data: { hotelId: hotel.id, firstName: 'Rodrigo', lastName: 'Demo', email: 'guest@example.com', phone: '+52 55 1234 5678', country: 'México' } });
  const reservation = await prisma.reservation.create({ data: { hotelId: hotel.id, guestId: guest.id, roomTypeId: deluxe.id, reservationCode: 'FUH-DEMO01', source: ReservationSource.DIRECT_WEB, status: ReservationStatus.CONFIRMED, checkInDate: new Date('2026-04-10T15:00:00.000Z'), checkOutDate: new Date('2026-04-12T12:00:00.000Z'), adults: 2, children: 0, nights: 2, baseAmount: 6400, taxAmount: 1024, feesAmount: 99, discountAmount: 0, totalAmount: 7523, amountPaid: 7523, paymentStatus: PaymentStatus.PAID, specialRequests: 'Late check-in' } });
  await prisma.payment.create({ data: { hotelId: hotel.id, reservationId: reservation.id, provider: PaymentProvider.MANUAL, amount: 7523, currency: 'MXN', status: PaymentRecordStatus.SUCCEEDED, paidAt: new Date('2026-03-20T18:00:00.000Z') } });
  console.log('Seed completed');
}
main().catch((error) => { console.error(error); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
