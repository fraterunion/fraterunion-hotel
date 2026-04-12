/**
 * Single source of truth for the deployed hotel instance (branding / copy only).
 * Swap these values per client deployment; apps import from @fraterunion/config.
 */
export const hotelConfig = {
  hotelName: 'Los Vagones',
  hotelShortName: 'Los Vagones',
  city: 'La Marquesa',
  region: 'Estado de México',
  country: 'México',
  heroTitle: 'Hospédate en Los Vagones',
  heroSubtitle:
    'Una experiencia única en La Marquesa, a minutos de Santa Fe',
  bookingHeadline: 'Planea tu estancia',
  bookingSubheadline:
    'Elige tus fechas y descubre las habitaciones disponibles al instante',
  supportEmail: 'losvagonesmex@gmail.com',
  supportPhone: '+52 55 8284 3604',
  address:
    'Camino A San Juan Yautepec s/n, Colonia, 52769 La Cañada, Méx., Mexico',
  /** Shown near address (e.g. distance to landmark). */
  locationReference: 'A 10 minutos de Santa Fe, Ciudad de México',
  checkInTime: '3:00 PM',
  checkOutTime: '11:00 AM',
  /** Default property slug for the booking UI (must match an existing hotel in the API). */
  defaultHotelSlug: 'hotel-boutique-demo',
  /** Admin sidebar subtitle under the property name. */
  adminShellTagline: 'Operaciones de la propiedad',
} as const;

export type HotelConfig = typeof hotelConfig;

export function hotelLocationLine(): string {
  return `${hotelConfig.city}, ${hotelConfig.region}`;
}

export function hotelLocationFull(): string {
  return `${hotelConfig.city}, ${hotelConfig.region}, ${hotelConfig.country}`;
}
