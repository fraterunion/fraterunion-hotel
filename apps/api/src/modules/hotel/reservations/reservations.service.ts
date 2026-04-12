import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreatePublicReservationDto } from './dto/create-public-reservation.dto';
import {
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

    const overlappingReservations = await this.prisma.reservation.count({
      where: {
        hotelId: hotel.id,
        roomTypeId: roomType.id,
        hotel: {
          tenantId: hotel.tenantId,
        },
        status: {
          in: [
            ReservationStatus.PENDING,
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

    if (!reservation.assignedRoomId) {
      throw new BadRequestException('Reservation must have an assigned room before check-in');
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

    const totalReservations = reservations.length;
    const pendingReservations = reservations.filter(r => r.status === 'PENDING').length;
    const confirmedReservations = reservations.filter(r => r.status === 'CONFIRMED').length;
    const checkedInReservations = reservations.filter(r => r.status === 'CHECKED_IN').length;
    const checkedOutReservations = reservations.filter(r => r.status === 'CHECKED_OUT').length;
    const cancelledReservations = reservations.filter(r => r.status === 'CANCELLED').length;

    const totalRevenuePaid = reservations.reduce(
      (sum, r) => sum + Number(r.amountPaid || 0),
      0,
    );

    const totalRevenueBooked = reservations.reduce(
      (sum, r) => sum + Number(r.totalAmount || 0),
      0,
    );

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
}