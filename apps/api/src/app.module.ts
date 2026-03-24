import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';

import { AuthModule } from './modules/core/auth/auth.module';
import { TenantsModule } from './modules/core/tenants/tenants.module';
import { UsersModule } from './modules/core/users/users.module';
import { HotelsModule } from './modules/hotel/hotels/hotels.module';
import { PublicModule } from './modules/hotel/public/public.module';
import { RoomTypesModule } from './modules/hotel/room-types/room-types.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    HotelsModule,
    PublicModule,
    RoomTypesModule,
  ],
  controllers: [AppController],
})
export class AppModule {}