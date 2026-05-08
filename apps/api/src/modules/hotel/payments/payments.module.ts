import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { EmailModule } from '../../core/email/email.module';
import { CheckoutShortLinksModule } from '../checkout-short-links/checkout-short-links.module';

@Module({
  imports: [PrismaModule, ConfigModule, EmailModule, CheckoutShortLinksModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}