/**
 * Safe one-shot script: removes the two demo room types created before real
 * inventory was set up ("habitacion-estandar" and "suite-vagon").
 *
 * Safety checks:
 *   1. Aborts if either room type has linked reservations.
 *   2. Deletes physical Room rows first (Restrict FK).
 *   3. Deletes RoomType rows — RoomTypeImage/Amenity/RoomBlock cascade automatically.
 *
 * Run against production:
 *   DATABASE_URL="<neon-prod-url>" npx ts-node --project tsconfig.json prisma/delete-demo-room-types.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DEMO_SLUGS = ['habitacion-estandar', 'suite-vagon'];

async function main() {
  // Resolve hotel (same logic as seed — single hotel in tenant)
  const hotel = await prisma.hotel.findUnique({ where: { slug: 'hotel-boutique-demo' } });
  if (!hotel) {
    console.error('Hotel not found — wrong DATABASE_URL?');
    process.exit(1);
  }

  const roomTypes = await prisma.roomType.findMany({
    where: { hotelId: hotel.id, slug: { in: DEMO_SLUGS } },
    include: {
      _count: { select: { reservations: true, rooms: true, images: true, amenities: true, roomBlocks: true } },
    },
  });

  if (roomTypes.length === 0) {
    console.log('Neither demo room type found — nothing to delete.');
    return;
  }

  console.log(`Found ${roomTypes.length} demo room type(s):`);
  for (const rt of roomTypes) {
    console.log(
      `  [${rt.slug}] id=${rt.id} status=${rt.status}` +
      ` | reservations=${rt._count.reservations} rooms=${rt._count.rooms}` +
      ` images=${rt._count.images} amenities=${rt._count.amenities} blocks=${rt._count.roomBlocks}`,
    );
  }

  // STOP if any reservations are linked
  const withReservations = roomTypes.filter((rt) => rt._count.reservations > 0);
  if (withReservations.length > 0) {
    console.error('\nABORTED — linked reservations found:');
    for (const rt of withReservations) {
      console.error(`  [${rt.slug}] has ${rt._count.reservations} reservation(s) — cannot delete`);
    }
    process.exit(1);
  }

  console.log('\nNo linked reservations — proceeding with deletion...');

  for (const rt of roomTypes) {
    // 1. Delete physical Room rows (Restrict FK prevents RoomType deletion while rooms exist)
    const deletedRooms = await prisma.room.deleteMany({ where: { roomTypeId: rt.id } });
    console.log(`  [${rt.slug}] deleted ${deletedRooms.count} room(s)`);

    // 2. Delete RoomType — images, amenities, and room blocks cascade automatically
    await prisma.roomType.delete({ where: { id: rt.id } });
    console.log(`  [${rt.slug}] deleted room type (images/amenities/blocks cascaded)`);
  }

  console.log('\nDone. Demo room types removed successfully.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
