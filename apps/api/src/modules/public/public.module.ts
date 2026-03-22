import { Module } from '@nestjs/common';
import { PublicController } from './public.controller';
import { HotelsModule } from '../hotels/hotels.module';

@Module({ imports: [HotelsModule], controllers: [PublicController] })
export class PublicModule {}
