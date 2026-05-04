import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import {
  PaymentRecordStatus,
  PaymentStatus,
  ReservationSource,
  ReservationStatus,
  RoomStatus,
} from '@prisma/client';
import { EmailService } from '../../core/email/email.service';

@Injectable()
export class ReservationsService {
  private readonly logger = new Logger(ReservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    ) {}

  private generateReservationCode() {
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `FUH-${random}`;
  }

  async createPublicReservation(dto: CreatePublicReservationDto) {
    const checkIn = new Date(dto.checkInDate);
    const checkOut = new Date(dto.checkOutDate);

    if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid dates');
    }

    if (checkOut <= checkIn) {
      throw new BadRequestException('checkOutDate must be after checkInDate');
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (nights < 1) {
      throw new BadRequestException('Reservation must be at least 1 night');
    }

    const hotel = await this.prisma.hotel.findUnique({
      where: { slug: dto.hotelSlug },
      select: {
        id: true,
        tenantId: true,
        slug: true,
        name: true,
        currency: true,
        settings: {
          select: {
            taxPercentage: true,
            serviceFeeType: true,
            serviceFeeValue: true,
          },
        },
      },
    });

    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    const roomType = await this.prisma.roomType.findFirst({
      where: {
        id: dto.roomTypeId,
        hotelId: hotel.id,
        hotel: {
          tenantId: hotel.tenantId,
        },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        basePrice: true,
        capacityAdults: true,
        capacityChildren: true,
      },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    if (dto.adults > roomType.capacityAdults) {
      throw new BadRequestException('Adults exceed room capacity');
    }

    if (dto.children > roomType.capacityChildren) {
      throw new BadRequestException('Children exceed room capacity');
    }

    const totalRooms = await this.prisma.room.count({
      where: {
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        hotel: {
          tenantId: hotel.tenantId,
        },
        status: {
          not: RoomStatus.OUT_OF_SERVICE,
        },
      },
    });

    // PENDING (unpaid) holds do not block inventory — only confirmed stays do.
    const overlappingReservations = await this.prisma.reservation.count({
      where: {
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        hotel: {
          tenantId: hotel.tenantId,
        },
        status: {
          in: [
            ReservationStatus.CONFIRMED,
            ReservationStatus.CHECKED_IN,
          ],
        },
        checkInDate: {
          lt: checkOut,
        },
        checkOutDate: {
          gt: checkIn,
        },
      },
    });

    const availableCount = Math.max(totalRooms - overlappingReservations, 0);

    if (availableCount <= 0) {
      throw new BadRequestException('No availability for selected room type');
    }

    const baseAmount = Number(roomType.basePrice) * nights;
    const taxPercentage = Number(hotel.settings?.taxPercentage || 0);
    const taxAmount = (baseAmount * taxPercentage) / 100;

    let feesAmount = 0;
    const feeType = hotel.settings?.serviceFeeType || null;
    const feeValue = Number(hotel.settings?.serviceFeeValue || 0);

    if (feeType === 'FIXED') {
      feesAmount = feeValue;
    } else if (feeType === 'PERCENTAGE') {
      feesAmount = (baseAmount * feeValue) / 100;
    }

    const discountAmount = 0;
    const totalAmount = baseAmount + taxAmount + feesAmount - discountAmount;

    const existingGuest = await this.prisma.guest.findFirst({
      where: {
        hotelId: hotel.id,
        email: dto.email,
        hotel: {
          tenantId: hotel.tenantId,
        },
      },
    });

    const guest = existingGuest
      ? await this.prisma.guest.update({
          where: { id: existingGuest.id },
          data: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phone: dto.phone,
            country: dto.country,
          },
        })
      : await this.prisma.guest.create({
          data: {
            hotelId: hotel.id,
            firstName: dto.firstName,
            lastName: dto.lastName,
            email: dto.email,
            phone: dto.phone,
            country: dto.country,
          },
        });

    const reservationCode = this.generateReservationCode();

    const reservation = await this.prisma.reservation.create({
      data: {
        hotelId: hotel.id,
        guestId: guest.id,
        roomTypeId: roomType.id,
        reservationCode,
        source: ReservationSource.DIRECT_WEB,
        status: ReservationStatus.PENDING,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults: dto.adults,
        children: dto.children,
        nights,
        baseAmount,
        taxAmount,
        feesAmount,
        discountAmount,
        totalAmount,
        amountPaid: 0,
        paymentStatus: PaymentStatus.PENDING,
        specialRequests: dto.specialRequests,
      },
      include: {
        guest: true,
        roomType: true,
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });

    this.logger.log(
      `[StripeFlow] Public reservation created id=${reservation.id} reservationCode=${reservation.reservationCode} status=${reservation.status} paymentStatus=${reservation.paymentStatus} — checkout-session must use this reservationId`,
    );

    await this.emailService.sendReservationCreatedEmail({
      to: reservation.guest.email || dto.email,
      guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
      reservationCode: reservation.reservationCode,
      hotelName: reservation.hotel.name,
      roomTypeName: reservation.roomType.name,
      checkInDate: reservation.checkInDate.toISOString().slice(0, 10),
      checkOutDate: reservation.checkOutDate.toISOString().slice(0, 10),
      totalAmount: reservation.totalAmount.toString(),
      currency: reservation.hotel.currency,
    });

    return {
      message: 'Reservation created successfully',
      reservation,
    };
  }

  async findAdminReservations(
    tenantId: string,
    hotelId?: string | null,
    status?: string,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    return this.prisma.reservation.findMany({
      where: {
        hotelId,
        hotel: {
          tenantId,
        },
        ...(status ? { status: status as ReservationStatus } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  async findAdminReservationById(
    tenantId: string,
    hotelId?: string | null,
    id?: string,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    return reservation;
  }

    async assignRoom(
    tenantId: string,
    hotelId?: string | null,
    reservationId?: string,
    roomId?: string,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      include: {
        roomType: true,
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (!roomId) {
      return this.prisma.reservation.update({
        where: { id: reservation.id },
        data: {
          assignedRoomId: null,
        },
        include: {
          guest: true,
          roomType: true,
          assignedRoom: true,
          payments: {
            orderBy: {
              createdAt: 'desc',
            },
          },
          hotel: {
            select: {
              id: true,
              name: true,
              slug: true,
              currency: true,
            },
          },
        },
      });
    }

    const room = await this.prisma.room.findFirst({
      where: {
        id: roomId,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      include: {
        roomType: true,
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.roomTypeId !== reservation.roomTypeId) {
      throw new BadRequestException(
        'Selected room does not belong to the reservation room type',
      );
    }

    if (room.status === 'OUT_OF_SERVICE') {
      throw new BadRequestException('Selected room is out of service');
    }

    const overlappingAssignment = await this.prisma.reservation.findFirst({
      where: {
        id: {
          not: reservation.id,
        },
        hotelId,
        assignedRoomId: room.id,
        hotel: {
          tenantId,
        },
        status: {
          in: [
            ReservationStatus.PENDING,
            ReservationStatus.CONFIRMED,
            ReservationStatus.CHECKED_IN,
          ],
        },
        checkInDate: {
          lt: reservation.checkOutDate,
        },
        checkOutDate: {
          gt: reservation.checkInDate,
        },
      },
      select: {
        id: true,
        reservationCode: true,
      },
    });

    if (overlappingAssignment) {
      throw new BadRequestException(
        `Room is already assigned to overlapping reservation ${overlappingAssignment.reservationCode}`,
      );
    }

    return this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        assignedRoomId: room.id,
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });
  }

    async checkIn(
    tenantId: string,
    hotelId?: string | null,
    reservationId?: string,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED reservations can be checked in');
    }

    return this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.CHECKED_IN,
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });
  }

  async checkOut(
    tenantId: string,
    hotelId?: string | null,
    reservationId?: string,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        hotelId,
        hotel: {
          tenantId,
        },
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status !== ReservationStatus.CHECKED_IN) {
      throw new BadRequestException('Only CHECKED_IN reservations can be checked out');
    }

    return this.prisma.reservation.update({
      where: { id: reservation.id },
      data: {
        status: ReservationStatus.CHECKED_OUT,
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
        },
        hotel: {
          select: {
            id: true,
            name: true,
            slug: true,
            currency: true,
          },
        },
      },
    });
  }

  async cancelReservation(
    tenantId: string,
    hotelId?: string | null,
    reservationId?: string,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const reservation = await this.prisma.reservation.findFirst({
      where: {
        id: reservationId,
        hotelId,
        hotel: { tenantId },
      },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: { orderBy: { createdAt: 'desc' } },
        hotel: { select: { id: true, name: true, slug: true, currency: true } },
      },
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return reservation;
    }

    if (reservation.status === ReservationStatus.CHECKED_OUT) {
      throw new BadRequestException('Cannot cancel a reservation that has already checked out');
    }

    return this.prisma.reservation.update({
      where: { id: reservation.id },
      data: { status: ReservationStatus.CANCELLED },
      include: {
        guest: true,
        roomType: true,
        assignedRoom: true,
        payments: { orderBy: { createdAt: 'desc' } },
        hotel: { select: { id: true, name: true, slug: true, currency: true } },
      },
    });
  }

    async getReservationMetrics(
    tenantId: string,
    hotelId?: string | null,
  ) {
    if (!hotelId) {
      throw new NotFoundException('Hotel context not found');
    }

    const reservations = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        hotel: {
          tenantId,
        },
      },
      select: {
        status: true,
        paymentStatus: true,
        totalAmount: true,
        amountPaid: true,
      },
    });

    // Exclude unpaid PENDING holds from operational counts.
    const operational = reservations.filter(r => r.status !== 'PENDING');

    const totalReservations = operational.length;
    const pendingReservations = reservations.filter(r => r.status === 'PENDING').length;
    const confirmedReservations = operational.filter(r => r.status === 'CONFIRMED').length;
    const checkedInReservations = operational.filter(r => r.status === 'CHECKED_IN').length;
    const checkedOutReservations = operational.filter(r => r.status === 'CHECKED_OUT').length;
    const cancelledReservations = operational.filter(r => r.status === 'CANCELLED').length;

    const totalRevenuePaid = reservations.reduce(
      (sum, r) => sum + Number(r.amountPaid || 0),
      0,
    );

    // Only count revenue from paid/operational reservations, not abandoned holds.
    const totalRevenueBooked = operational
      .filter(r => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(r.status))
      .reduce((sum, r) => sum + Number(r.totalAmount || 0), 0);

    const totalRevenuePending = Math.max(totalRevenueBooked - totalRevenuePaid, 0);

    return {
      totalReservations,
      pendingReservations,
      confirmedReservations,
      checkedInReservations,
      checkedOutReservations,
      cancelledReservations,
      totalRevenueBooked,
      totalRevenuePaid,
      totalRevenuePending,
    };
  }

  async getDashboardMetrics(tenantId: string, hotelId?: string | null) {
    if (!hotelId) throw new NotFoundException('Hotel context not found');

    const now = new Date();
    const ny = now.getUTCFullYear();
    const nm = now.getUTCMonth();
    const nd = now.getUTCDate();

    const todayStart = new Date(Date.UTC(ny, nm, nd));
    const todayEnd   = new Date(Date.UTC(ny, nm, nd + 1));
    const weekStart  = new Date(Date.UTC(ny, nm, nd - now.getUTCDay())); // Sunday
    const monthStart = new Date(Date.UTC(ny, nm, 1));
    const monthEnd   = new Date(Date.UTC(ny, nm + 1, 1));
    const yearStart  = new Date(Date.UTC(ny, 0, 1));
    const yearEnd    = new Date(Date.UTC(ny + 1, 0, 1));

    const daysInMonth = Math.round((monthEnd.getTime() - monthStart.getTime()) / 86400000);
    const daysInYear  = Math.round((yearEnd.getTime()  - yearStart.getTime())  / 86400000);

    // All succeeded payments for this hotel
    const payments = await this.prisma.payment.findMany({
      where: { hotelId, status: PaymentRecordStatus.SUCCEEDED },
      select: { amount: true, paidAt: true },
    });

    const sumPaidIn = (from: Date, to: Date): number =>
      payments
        .filter((p) => p.paidAt != null && p.paidAt >= from && p.paidAt < to)
        .reduce((s, p) => s + Number(p.amount), 0);

    const revenueToday     = sumPaidIn(todayStart, todayEnd);
    const revenueThisWeek  = sumPaidIn(weekStart,  todayEnd);
    const revenueThisMonth = sumPaidIn(monthStart,  monthEnd);
    const revenueLifetime  = payments.reduce((s, p) => s + Number(p.amount), 0);

    // Operational reservations only (CONFIRMED / CHECKED_IN / CHECKED_OUT)
    const reservations = await this.prisma.reservation.findMany({
      where: {
        hotelId,
        hotel: { tenantId },
        status: {
          in: [
            ReservationStatus.CONFIRMED,
            ReservationStatus.CHECKED_IN,
            ReservationStatus.CHECKED_OUT,
          ],
        },
      },
      select: {
        roomTypeId: true,
        checkInDate: true,
        checkOutDate: true,
        status: true,
        amountPaid: true,
      },
    });

    // Room types with room counts
    const roomTypes = await this.prisma.roomType.findMany({
      where: { hotelId, hotel: { tenantId } },
      select: {
        id: true,
        name: true,
        rooms: {
          where: { status: { not: RoomStatus.OUT_OF_SERVICE } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    function nightsInPeriod(ci: Date, co: Date, ps: Date, pe: Date): number {
      const from = ci < ps ? ps : ci;
      const to   = co > pe ? pe : co;
      if (to <= from) return 0;
      return Math.round((to.getTime() - from.getTime()) / 86400000);
    }

    // Cabin performance (sorted by revenue DESC)
    const cabinPerformance = roomTypes
      .map((rt) => {
        const rtRes = reservations.filter((r) => r.roomTypeId === rt.id);
        const revenue = rtRes.reduce((s, r) => s + Number(r.amountPaid || 0), 0);
        const roomCount = rt.rooms.length;
        const resNightsMonth = rtRes.reduce(
          (s, r) => s + nightsInPeriod(r.checkInDate, r.checkOutDate, monthStart, monthEnd), 0,
        );
        const availNightsMonth = roomCount * daysInMonth;
        const occupancyMonth = availNightsMonth > 0 ? resNightsMonth / availNightsMonth : 0;
        return { id: rt.id, name: rt.name, revenue, reservations: rtRes.length, occupancyMonth };
      })
      .sort((a, b) => b.revenue - a.revenue);

    // Overall occupancy
    const totalRooms = roomTypes.reduce((s, rt) => s + rt.rooms.length, 0);
    const occupancyThisMonth =
      totalRooms * daysInMonth > 0
        ? reservations.reduce((s, r) => s + nightsInPeriod(r.checkInDate, r.checkOutDate, monthStart, monthEnd), 0) /
          (totalRooms * daysInMonth)
        : 0;
    const occupancyThisYear =
      totalRooms * daysInYear > 0
        ? reservations.reduce((s, r) => s + nightsInPeriod(r.checkInDate, r.checkOutDate, yearStart, yearEnd), 0) /
          (totalRooms * daysInYear)
        : 0;

    // Chart: daily — last 30 days
    const revenueByDay: { date: string; value: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const ds = new Date(Date.UTC(ny, nm, nd - i));
      const de = new Date(Date.UTC(ny, nm, nd - i + 1));
      revenueByDay.push({ date: ds.toISOString().slice(0, 10), value: sumPaidIn(ds, de) });
    }

    // Chart: weekly — last 12 weeks
    const revenueByWeek: { week: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const ws = new Date(weekStart);
      ws.setUTCDate(ws.getUTCDate() - i * 7);
      const we = new Date(ws);
      we.setUTCDate(we.getUTCDate() + 7);
      revenueByWeek.push({ week: ws.toISOString().slice(0, 10), value: sumPaidIn(ws, we) });
    }

    // Chart: monthly — last 12 months
    const revenueByMonth: { month: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const ms = new Date(Date.UTC(ny, nm - i, 1));
      const me = new Date(Date.UTC(ny, nm - i + 1, 1));
      revenueByMonth.push({ month: ms.toISOString().slice(0, 7), value: sumPaidIn(ms, me) });
    }

    // Chart: yearly
    const yearMap = new Map<string, number>();
    for (const p of payments) {
      if (!p.paidAt) continue;
      const yr = String(p.paidAt.getUTCFullYear());
      yearMap.set(yr, (yearMap.get(yr) ?? 0) + Number(p.amount));
    }
    const revenueByYear = Array.from(yearMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, value]) => ({ year, value }));

    // Today's operations
    const currentlyCheckedIn = reservations.filter(
      (r) => r.status === ReservationStatus.CHECKED_IN,
    ).length;
    const todayArrivals = reservations.filter(
      (r) => r.checkInDate >= todayStart && r.checkInDate < todayEnd,
    ).length;
    const todayDepartures = reservations.filter(
      (r) => r.checkOutDate >= todayStart && r.checkOutDate < todayEnd,
    ).length;

    return {
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
      revenueLifetime,
      occupancyThisMonth,
      occupancyThisYear,
      cabinPerformance,
      revenueByDay,
      revenueByWeek,
      revenueByMonth,
      revenueByYear,
      currentlyCheckedIn,
      todayArrivals,
      todayDepartures,
    };
  }
}