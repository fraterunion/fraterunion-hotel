import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RoomTypesController } from './room-types.controller';
import { RoomTypesService } from './room-types.service';

@Module({
  imports: [PrismaModule],
  controllers: [RoomTypesController],
  providers: [RoomTypesService],
})
export class RoomTypesModule {}