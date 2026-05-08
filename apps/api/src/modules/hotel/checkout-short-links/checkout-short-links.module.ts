import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CheckoutShortLinksController } from './checkout-short-links.controller';
import { CheckoutShortLinksService } from './checkout-short-links.service';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [CheckoutShortLinksController],
  providers: [CheckoutShortLinksService],
  exports: [CheckoutShortLinksService],
})
export class CheckoutShortLinksModule {}
