/**
 * Spanish (Mexico) client copy for the public booking experience.
 * Centralized for consistency and future i18n.
 */

/** Display labels for API reservation status values (Prisma enums). */
export const reservationStatusEs: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'En estancia',
  CHECKED_OUT: 'Estancia finalizada',
  CANCELLED: 'Cancelada',
  NO_SHOW: 'No presentado',
};

/** Display labels for API payment status values. */
export const paymentStatusEs: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIALLY_PAID: 'Pago parcial',
  PAID: 'Pagado',
  FAILED: 'No procesado',
  REFUNDED: 'Reembolsado',
};

export function formatGuestsLine(adults: string, children: string): string {
  const a = Number(adults);
  const c = Number(children);
  const adultLabel = a === 1 ? 'adulto' : 'adultos';
  const childLabel = c === 1 ? 'menor' : 'menores';
  return `${a} ${adultLabel} · ${c} ${childLabel}`;
}

export function roomOptionsLabel(count: number): string {
  if (count === 1) return '1 opción';
  return `${count} opciones`;
}

export const bookingCopy = {
  errors: {
    searchFallback: 'No pudimos consultar la disponibilidad. Intenta de nuevo.',
    reserveFallback: 'No pudimos completar tu reserva. Intenta de nuevo.',
    paymentFallback: 'No pudimos iniciar el pago. Intenta de nuevo.',
    selectRoomType: 'Selecciona un tipo de habitación.',
  },

  hero: {
    checkIn: 'Entrada',
    checkOut: 'Salida',
  },

  search: {
    arrival: 'Llegada',
    departure: 'Salida',
    searching: 'Consultando…',
    searchCta: 'Ver disponibilidad',
  },

  rooms: {
    sectionTitle: 'Nuestras habitaciones',
    sectionSubtitle:
      'Cada espacio está pensado para el descanso. Tarifas transparentes por noche.',
    emptyTitle: 'Indica cuándo vienes y te mostramos lo disponible.',
    emptyBody:
      'A la derecha verás tu resumen actualizado mientras eliges fechas y habitación.',
    noAvailability:
      'No hay disponibilidad en esas fechas. Prueba con otras fechas.',
    perNight: '/ noche',
    descriptionFallback:
      'Pensado para noches de descanso y una estancia tranquila.',
    upToAdults: (n: number) =>
      n === 1 ? 'Hasta 1 adulto' : `Hasta ${n} adultos`,
    /** Máximo de menores permitidos en la habitación */
    maxChildren: (n: number) =>
      n === 0
        ? 'Sin menores'
        : n === 1
          ? 'Hasta 1 menor'
          : `Hasta ${n} menores`,
    roomsLeft: (n: number) =>
      n === 1 ? 'Queda 1 habitación' : `Quedan ${n} habitaciones`,
    selectRoom: 'Seleccionar habitación',
  },

  guest: {
    title: 'Datos del huésped',
    subtitle:
      'Indica quién se hospeda. Te confirmaremos todo por correo electrónico.',
    contact: 'Contacto',
    party: 'Grupo y preferencias',
    firstName: 'Nombre',
    lastName: 'Apellidos',
    email: 'Correo electrónico',
    phone: 'Teléfono',
    country: 'País',
    adults: 'Adultos',
    children: 'Menores',
    specialRequests: 'Solicitudes especiales',
    creating: 'Creando reserva…',
    createCta: 'Crear reserva',
    completeCta: 'Completar reserva',
  },

  summary: {
    eyebrow: 'Tu estancia',
    title: 'Resumen de la reserva',
    subtitle: 'Se actualiza al elegir fechas y habitación.',
    dates: 'Fechas',
    nights: 'Noches',
    room: 'Habitación',
    roomPlaceholder: 'Elige un tipo de habitación',
    guests: 'Huéspedes',
    estimatedTotal: 'Total estimado',
    estimateNote: (nights: number) => {
      const n = nights === 1 ? '1 noche' : `${nights} noches`;
      return `Tarifa por noche × ${n}. Impuestos y cargos se confirman al pagar.`;
    },
    estimateHint:
      'Busca y elige una habitación para ver un total estimado.',
    changeRoom: 'Cambiar habitación',
    lockedHint:
      'Busca fechas y elige una habitación para continuar con tus datos y el pago.',
    creating: 'Creando reserva…',
  },

  success: {
    badge: 'Reserva creada',
    thankYou: (firstName: string) => `Gracias, ${firstName}`,
    bodyBeforeStatus: (hotelName: string) =>
      `Tu reserva en ${hotelName} está registrada. El estado actual es`,
    bodyAfterStatus:
      '. Te enviaremos los siguientes pasos por correo electrónico.',
    supportLinePrefix: 'Entrada a partir de las',
    supportLineMiddle: '· Salida antes de las',
    supportLineSuffix: '¿Necesitas ayuda? Escríbenos a',
    orCall: 'o llámanos al',
    reservationCode: 'Código de reserva',
    paymentStatus: 'Estado del pago',
    totalAmount: 'Importe total',
    hotel: 'Hotel',
    roomType: 'Tipo de habitación',
    stay: 'Estancia',
    proceedPay: 'Continuar al pago',
    anotherBooking: 'Hacer otra reserva',
  },

  paymentSuccess: {
    ctaSectionLabel: 'Siguiente paso',
    badge: 'Pago exitoso',
    title: 'Pago completado',
    body: (hotelName: string) =>
      `Gracias por elegir ${hotelName}. Tu pago se procesó correctamente y tu reserva debería aparecer como confirmada en nuestro sistema.`,
    times: (inTime: string, outTime: string) =>
      `Entrada a partir de las ${inTime} · Salida antes de las ${outTime}. Si necesitas algo antes de tu llegada, contáctanos en`,
    orAt: 'o al',
    backToBooking: 'Volver a reservar',
  },

  paymentCancel: {
    ctaSectionLabel: 'Continuar',
    badge: 'Pago no completado',
    title: 'Pago cancelado',
    body: (hotelName: string) =>
      `No se realizó ningún cargo. Tu reserva en ${hotelName} puede seguir pendiente: puedes volver al proceso para intentar el pago de nuevo.`,
    questions: '¿Dudas? Escríbenos a',
    orAt: 'o al',
    returnToBooking: 'Volver a la reserva',
  },

  home: {
    bookCta: 'Reservar estancia',
  },

  catalog: {
    eyebrow: 'Cabañas & Vagones',
    headline: 'Elige tu espacio',
    subheadline:
      'Seis espacios únicos en el bosque de La Marquesa. Cada uno con fogata privada y entrada independiente.',
    perNight: '/ noche',
    viewCabin: 'Ver cabaña',
    capacityLabel: (n: number) => `Hasta ${n} personas`,
    loading: 'Cargando cabañas…',
    error: 'No pudimos cargar las cabañas. Intenta de nuevo.',
  },

  detail: {
    backLabel: 'Todas las cabañas',
    cabinEyebrow: 'Los Vagones · La Marquesa',
    experienceTitle: 'La experiencia',
    specsTitle: 'Tu espacio',
    amenitiesTitle: 'Incluido en tu estancia',
    bookingCardTitle: 'Reservar esta cabaña',
    checkAvailability: 'Verificar disponibilidad',
    checking: 'Verificando…',
    unavailableMsg:
      'No hay disponibilidad para esas fechas. Elige otras fechas.',
    changeDates: 'Cambiar fechas',
    noTaxNote: 'Sin impuestos incluidos',
    notFound: 'Cabaña no encontrada.',
    notFoundCta: 'Ver todas las cabañas',
    calendarLoading: 'Cargando disponibilidad…',
    calendarError: 'No se pudo cargar el calendario.',
    selectCheckIn: 'Selecciona tu fecha de llegada',
    selectCheckOut: 'Ahora selecciona tu fecha de salida',
  },
} as const;
