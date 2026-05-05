import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// TODO: source from @fraterunion/config once the config package is added as
// an API dependency. For now hardcoded to match defaultHotelSlug in hotel.ts.
const HOTEL_SLUG = 'hotel-boutique-demo';

export type AvailabilityResult = {
  checkInDate: string;
  checkOutDate: string;
  availableCabins: Array<{
    name: string;
    slug: string;
    priceFrom: number;
    capacityAdults?: number;
  }>;
};

@Injectable()
export class BotAvailabilityService {
  private readonly logger = new Logger(BotAvailabilityService.name);
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const port = this.configService.get<string>('PORT') ?? '4000';
    // INTERNAL_API_URL can be set in production to avoid the loopback hop.
    // Falls back to localhost for local dev and Railway (same container).
    this.baseUrl =
      this.configService.get<string>('INTERNAL_API_URL') ??
      `http://localhost:${port}`;
  }

  async searchAvailability(input: {
    checkInDate: string;
    checkOutDate: string;
  }): Promise<AvailabilityResult> {
    const url = `${this.baseUrl}/api/public/availability/search`;

    this.logger.log(
      `Fetching availability ${input.checkInDate} → ${input.checkOutDate} from ${url}`,
    );

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hotelSlug: HOTEL_SLUG,
        checkInDate: input.checkInDate,
        checkOutDate: input.checkOutDate,
      }),
    });

    if (!res.ok) {
      throw new Error(`Availability API returned HTTP ${res.status}`);
    }

    const data = await res.json();

    const availableCabins: AvailabilityResult['availableCabins'] = (
      data.results ?? []
    ).map((cabin: any) => ({
      name: cabin.name as string,
      slug: cabin.slug as string,
      // Use low-occupancy price as the advertised starting price when present
      priceFrom: cabin.lowOccupancyPrice
        ? Number(cabin.lowOccupancyPrice)
        : Number(cabin.basePrice),
      capacityAdults: cabin.capacityAdults as number | undefined,
    }));

    return {
      checkInDate: input.checkInDate,
      checkOutDate: input.checkOutDate,
      availableCabins,
    };
  }
}
