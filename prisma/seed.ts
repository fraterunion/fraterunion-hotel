import { PrismaClient, HotelStatus, UserRole, UserStatus, TenantStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Admin123*', 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Demo Tenant',
      slug: 'demo-tenant',
      status: TenantStatus.ACTIVE,
    },
  });

  const hotel = await prisma.hotel.create({
    data: {
      tenantId: tenant.id,
      name: 'Hotel Boutique Demo',
      slug: 'hotel-boutique-demo',
      legalName: 'Hotel Boutique Demo SA de CV',
      email: 'admin@hotel.com',
      phone: '+52 5555555555',
      website: 'https://hotel.com',
      timezone: 'America/Mexico_City',
      currency: 'MXN',
      status: HotelStatus.ACTIVE,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      hotelId: hotel.id,
      firstName: 'Admin',
      lastName: 'HotelOS',
      email: 'admin@hotelos.com',
      passwordHash,
      role: UserRole.HOTEL_ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Seed listo 🚀');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());