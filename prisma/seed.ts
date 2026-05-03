import {
  PrismaClient,
  HotelStatus,
  UserRole,
  UserStatus,
  TenantStatus,
  RoomTypeStatus,
  RoomStatus,
  FeeType,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // ── Tenant ──────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'fraterunion' },
    update: {},
    create: {
      name: 'FraterUnion',
      slug: 'fraterunion',
      status: TenantStatus.ACTIVE,
    },
  });

  // ── Hotel ────────────────────────────────────────────────────────────────────
  // slug must match defaultHotelSlug in packages/config/src/hotel.ts
  const hotel = await prisma.hotel.upsert({
    where: { slug: 'hotel-boutique-demo' },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Los Vagones',
      slug: 'hotel-boutique-demo',
      legalName: 'Los Vagones',
      email: 'losvagonesmex@gmail.com',
      phone: '+52 55 8284 3604',
      website: 'https://losvagones.mx',
      timezone: 'America/Mexico_City',
      currency: 'MXN',
      status: HotelStatus.ACTIVE,
    },
  });

  // ── Hotel settings ────────────────────────────────────────────────────────────
  await prisma.hotelSettings.upsert({
    where: { hotelId: hotel.id },
    update: {},
    create: {
      hotelId: hotel.id,
      city: 'La Marquesa',
      state: 'Estado de México',
      country: 'México',
      addressLine1: 'Camino A San Juan Yautepec s/n',
      postalCode: '52769',
      checkInTime: '15:00',
      checkOutTime: '11:00',
      taxPercentage: 16.00, // IVA México
      serviceFeeType: FeeType.PERCENTAGE,
      serviceFeeValue: 5.00,
      contactEmail: 'losvagonesmex@gmail.com',
      contactPhone: '+52 55 8284 3604',
    },
  });

  // ── Room types ────────────────────────────────────────────────────────────────
  const standard = await prisma.roomType.upsert({
    where: { hotelId_slug: { hotelId: hotel.id, slug: 'habitacion-estandar' } },
    update: {},
    create: {
      hotelId: hotel.id,
      name: 'Habitación Estándar',
      slug: 'habitacion-estandar',
      description: 'Vagón renovado con vista al bosque, cama matrimonial y baño privado.',
      basePrice: 1800.00,
      capacityAdults: 2,
      capacityChildren: 1,
      bedType: 'Matrimonial',
      sizeM2: 22,
      status: RoomTypeStatus.ACTIVE,
    },
  });

  const suite = await prisma.roomType.upsert({
    where: { hotelId_slug: { hotelId: hotel.id, slug: 'suite-vagon' } },
    update: {},
    create: {
      hotelId: hotel.id,
      name: 'Suite Vagón',
      slug: 'suite-vagon',
      description: 'Suite con terraza privada, cama king y vista panorámica al bosque.',
      basePrice: 2800.00,
      capacityAdults: 2,
      capacityChildren: 2,
      bedType: 'King',
      sizeM2: 35,
      status: RoomTypeStatus.ACTIVE,
    },
  });

  // ── Rooms ─────────────────────────────────────────────────────────────────────
  const standardRooms = ['101', '102', '103', '104', '105'];
  for (const roomNumber of standardRooms) {
    await prisma.room.upsert({
      where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber } },
      update: {},
      create: {
        hotelId: hotel.id,
        roomTypeId: standard.id,
        roomNumber,
        status: RoomStatus.AVAILABLE,
      },
    });
  }

  const suiteRooms = ['201', '202', '203'];
  for (const roomNumber of suiteRooms) {
    await prisma.room.upsert({
      where: { hotelId_roomNumber: { hotelId: hotel.id, roomNumber } },
      update: {},
      create: {
        hotelId: hotel.id,
        roomTypeId: suite.id,
        roomNumber,
        status: RoomStatus.AVAILABLE,
      },
    });
  }

  // ── Admin user ────────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('ChangeMe123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@losvagones.mx' },
    update: {},
    create: {
      tenantId: tenant.id,
      hotelId: hotel.id,
      firstName: 'Admin',
      lastName: 'Los Vagones',
      email: 'admin@losvagones.mx',
      passwordHash,
      role: UserRole.HOTEL_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Seed completo ✓');
  console.log(`  Tenant : ${tenant.slug}`);
  console.log(`  Hotel  : ${hotel.slug} (${hotel.name})`);
  console.log(`  Tipos  : Habitación Estándar (x${standardRooms.length}), Suite Vagón (x${suiteRooms.length})`);
  console.log(`  Admin  : admin@losvagones.mx / ChangeMe123!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
