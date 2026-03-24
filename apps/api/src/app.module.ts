import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { HotelsModule } from './modules/hotels/hotels.module';
import { PublicModule } from './modules/public/public.module';
import { RoomTypesModule } from './modules/room-types/room-types.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, envFilePath: '../../.env' }), PrismaModule, AuthModule, HotelsModule, PublicModule,RoomTypesModule],
  controllers: [AppController],
})
export class AppModule {}
