import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { EmailModule } from '../../core/email/email.module';

@Module({
  imports: [PrismaModule, EmailModule],
  controllers: [ReservationsController],
  providers: [ReservationsService],
})
export class ReservationsModule {}