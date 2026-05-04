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

async function upsertRoomType(
  hotelId: string,
  rt: {
    slug: string;
    name: string;
    description: string;
    basePrice: number;
    lowOccupancyPrice?: number;
    lowOccupancyThreshold?: number;
    capacityAdults: number;
    capacityChildren: number;
    bedType: string;
    sizeM2?: number;
  },
  amenities: string[],
  roomNumber: string,
) {
  const roomType = await prisma.roomType.upsert({
    where: { hotelId_slug: { hotelId, slug: rt.slug } },
    update: {
      name: rt.name,
      description: rt.description,
      basePrice: rt.basePrice,
      lowOccupancyPrice: rt.lowOccupancyPrice ?? null,
      lowOccupancyThreshold: rt.lowOccupancyThreshold ?? null,
      capacityAdults: rt.capacityAdults,
      capacityChildren: rt.capacityChildren,
      bedType: rt.bedType,
      ...(rt.sizeM2 !== undefined ? { sizeM2: rt.sizeM2 } : {}),
      status: RoomTypeStatus.ACTIVE,
    },
    create: {
      hotelId,
      slug: rt.slug,
      name: rt.name,
      description: rt.description,
      basePrice: rt.basePrice,
      lowOccupancyPrice: rt.lowOccupancyPrice ?? null,
      lowOccupancyThreshold: rt.lowOccupancyThreshold ?? null,
      capacityAdults: rt.capacityAdults,
      capacityChildren: rt.capacityChildren,
      bedType: rt.bedType,
      ...(rt.sizeM2 !== undefined ? { sizeM2: rt.sizeM2 } : {}),
      status: RoomTypeStatus.ACTIVE,
    },
  });

  // Replace amenities on every run so they stay in sync with this file
  await prisma.roomTypeAmenity.deleteMany({ where: { roomTypeId: roomType.id } });
  await prisma.roomTypeAmenity.createMany({
    data: amenities.map((name, sortOrder) => ({
      roomTypeId: roomType.id,
      name,
      sortOrder,
    })),
  });

  // Upsert physical unit — do not override admin status changes on reruns
  await prisma.room.upsert({
    where: { hotelId_roomNumber: { hotelId, roomNumber } },
    update: {},
    create: {
      hotelId,
      roomTypeId: roomType.id,
      roomNumber,
      status: RoomStatus.AVAILABLE,
    },
  });

  return roomType;
}

async function main() {
  // ── Tenant ───────────────────────────────────────────────────────────────────
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

  // ── Hotel settings ───────────────────────────────────────────────────────────
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
      taxPercentage: 16.00, // IVA México — prices in seed are pre-tax
      serviceFeeType: FeeType.PERCENTAGE,
      serviceFeeValue: 5.00,
      contactEmail: 'losvagonesmex@gmail.com',
      contactPhone: '+52 55 8284 3604',
    },
  });

  // ── Deactivate demo room types ───────────────────────────────────────────────
  // Sets status INACTIVE (hidden from availability) and rooms OUT_OF_SERVICE.
  // Does not delete — avoids foreign-key constraint errors if any reservations exist.
  for (const slug of ['habitacion-estandar', 'suite-vagon']) {
    const demo = await prisma.roomType.findUnique({
      where: { hotelId_slug: { hotelId: hotel.id, slug } },
    });
    if (demo) {
      await prisma.roomType.update({
        where: { id: demo.id },
        data: { status: RoomTypeStatus.INACTIVE },
      });
      await prisma.room.updateMany({
        where: { hotelId: hotel.id, roomTypeId: demo.id },
        data: { status: RoomStatus.OUT_OF_SERVICE },
      });
    }
  }

  // ── Real Los Vagones inventory ───────────────────────────────────────────────
  // 6 cabin/wagon types — each is a single unique physical unit.
  // basePrice is nightly in MXN, pre-IVA.
  // Extra-person pricing for Casa Grande is noted in description;
  // schema does not yet support a dedicated extraPersonFee field.

  await upsertRoomType(
    hotel.id,
    {
      slug: 'casa-grande',
      name: 'Casa Grande',
      description:
        'Cabaña grande con 5 recámaras. Planta alta: dos recámaras gemelas con dos camas individuales cada una y baño compartido. Planta baja: recámara king size con pequeña sala, baño completo y vestidor; recámara queen size con medio baño; recámara matrimonial con baño completo. Cuenta con cocina completa, refrigerador, estufa, microondas, dos salas, dos comedores, mesa de billar, chimenea, palapa al aire libre y espacio privado para fogata. Precio incluye hasta 12 personas; persona adicional a partir de la 13ª: $250 MXN por persona por noche.',
      basePrice: 7300.00,
      capacityAdults: 12,
      capacityChildren: 0,
      bedType: 'King, Queen, Matrimonial, 2× Individual',
    },
    [
      '5 recámaras',
      'Cocina completa',
      'Refrigerador',
      'Estufa',
      'Microondas',
      '2 salas',
      '2 comedores',
      'Mesa de billar',
      'Chimenea',
      'Palapa',
      'Fogata privada',
      'Agua caliente',
      'Shampoo y jabón',
      'Toallas',
    ],
    'CG-01',
  );

  await upsertRoomType(
    hotel.id,
    {
      slug: 'girasoles',
      name: 'Girasoles',
      description:
        'Cabaña tipo camping sin divisiones interiores. Cuenta con pequeña sala, tapanco para 3 personas, dos camas individuales y una cama matrimonial, todo en una sola área. Incluye espacio privado al aire libre con fogata.',
      basePrice: 2200.00,
      capacityAdults: 7,
      capacityChildren: 0,
      bedType: 'Matrimonial + 2 individuales + tapanco',
    },
    [
      'Tapanco',
      'Pequeña sala',
      '2 camas individuales',
      '1 cama matrimonial',
      'Fogata privada',
      'Agua caliente',
      'Shampoo y jabón',
      'Toallas',
    ],
    'GIR-01',
  );

  await upsertRoomType(
    hotel.id,
    {
      slug: 'alcatraces',
      name: 'Alcatraces',
      description:
        'Cabaña tipo camping sin divisiones interiores. Cuenta con pequeña sala, tapanco para 3 personas, dos camas individuales y una cama matrimonial, todo en una sola área. Incluye espacio privado al aire libre con fogata.',
      basePrice: 2200.00,
      capacityAdults: 7,
      capacityChildren: 0,
      bedType: 'Matrimonial + 2 individuales + tapanco',
    },
    [
      'Tapanco',
      'Pequeña sala',
      '2 camas individuales',
      '1 cama matrimonial',
      'Fogata privada',
      'Agua caliente',
      'Shampoo y jabón',
      'Toallas',
    ],
    'ALC-01',
  );

  await upsertRoomType(
    hotel.id,
    {
      slug: 'cabana-del-aguila',
      name: 'Cabaña del Águila',
      description:
        'Cabaña tipo camping más amplia. Cuenta con cocina completa, frigobar, microondas, tres camas matrimoniales y una cama individual. Incluye espacio privado al aire libre con fogata.',
      basePrice: 3400.00,
      capacityAdults: 7,
      capacityChildren: 0,
      bedType: '3 matrimoniales + 1 individual',
    },
    [
      'Cocina completa',
      'Frigobar',
      'Microondas',
      '3 camas matrimoniales',
      '1 cama individual',
      'Fogata privada',
      'Agua caliente',
      'Shampoo y jabón',
      'Toallas',
    ],
    'AGU-01',
  );

  await upsertRoomType(
    hotel.id,
    {
      slug: 'vagon-el-colorado',
      name: 'Vagón Cabina El Colorado',
      description:
        'Vagón construido en Nueva York en 1948, adaptado como habitación. Interior de madera, dos camas matrimoniales, pantalla plana con TV abierta, microondas y frigobar. Incluye espacio privado al aire libre con fogata.',
      basePrice: 1750.00,
      lowOccupancyPrice: 1400.00,
      lowOccupancyThreshold: 2,
      capacityAdults: 4,
      capacityChildren: 0,
      bedType: '2 matrimoniales',
    },
    [
      'Vagón histórico 1948',
      'Interior de madera',
      '2 camas matrimoniales',
      'Pantalla plana',
      'TV abierta',
      'Microondas',
      'Frigobar',
      'Fogata privada',
      'Agua caliente',
      'Shampoo y jabón',
      'Toallas',
    ],
    'COL-01',
  );

  await upsertRoomType(
    hotel.id,
    {
      slug: 'cabana-del-pozo',
      name: 'Cabaña del Pozo',
      description:
        'Cabaña con una cama matrimonial y dos camas individuales en tapanco, con los pies de frente una con otra. Cuenta con pantalla plana con TV abierta, cafetera y microondas. Incluye espacio privado al aire libre con fogata.',
      basePrice: 1750.00,
      lowOccupancyPrice: 1400.00,
      lowOccupancyThreshold: 2,
      capacityAdults: 4,
      capacityChildren: 0,
      bedType: 'Matrimonial + 2 individuales en tapanco',
    },
    [
      '1 cama matrimonial',
      '2 camas individuales en tapanco',
      'Pantalla plana',
      'TV abierta',
      'Cafetera',
      'Microondas',
      'Fogata privada',
      'Agua caliente',
      'Shampoo y jabón',
      'Toallas',
    ],
    'POZ-01',
  );

  // ── Admin user ───────────────────────────────────────────────────────────────
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
  console.log('  Cabañas/Vagones:');
  console.log('    CG-01  · Casa Grande                  · $7,300 MXN');
  console.log('    GIR-01 · Girasoles                    · $2,200 MXN');
  console.log('    ALC-01 · Alcatraces                   · $2,200 MXN');
  console.log('    AGU-01 · Cabaña del Águila             · $3,400 MXN');
  console.log('    COL-01 · Vagón Cabina El Colorado      · $1,750 MXN');
  console.log('    POZ-01 · Cabaña del Pozo               · $1,750 MXN');
  console.log(`  Admin  : admin@losvagones.mx / ChangeMe123!`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
