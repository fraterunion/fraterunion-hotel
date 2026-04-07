import { IsString } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsString()
  reservationId!: string;
}