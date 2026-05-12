export type FaqCategory =
  | 'ubicacion'
  | 'reservaciones'
  | 'clima'
  | 'actividades'
  | 'mascotas'
  | 'pagos'
  | 'eventos'
  | 'seguridad'
  | 'servicios'
  | 'alimentos'
  | 'wifi';

export interface HotelFaq {
  id: string;
  category: FaqCategory;
  /** Normalized keywords (lowercase, no accents, no punctuation) */
  keywords: string[];
  /** Exact approved answer to return verbatim */
  answer: string;
  /** Higher = matched first when multiple FAQs score equally (default 1) */
  priority?: number;
}

// ── CONFLICTS TO RESOLVE BEFORE PRODUCTION ──────────────────────────────────
// 1. EVENTS PHONE: Two phone numbers seen for wedding/event inquiries.
//    Currently using config supportPhone: +52 55 8284 3604. Confirm or replace.
// 2. IVA POLICY: Using "precios incluyen IVA" as safe default.
//    Confirm this is accurate — if IVA is added on top, update 'iva' answer.
// 3. LEÑA (FIREWOOD): Using "consulta disponibilidad de leña" to avoid promising
//    it's free. Confirm if leña is included gratis or charged separately.
// 4. WIFI: Using "WiFi en áreas comunes, señal variable en zona de montaña."
//    Confirm exact coverage — cabin WiFi? No WiFi at all? Hotspot only?
// 5. CHECK-IN EARLY/LATE: Answer references 3:00 PM from config. If early
//    check-in is offered for a fee, update the answer.
// 6. HOT WATER: Answer says "agua caliente las 24 horas." Confirm this is
//    accurate — some mountain properties have limited hot water hours.
// ────────────────────────────────────────────────────────────────────────────

export const HOTEL_FAQS: HotelFaq[] = [

  // ── Ubicación ──────────────────────────────────────────────────────────────

  {
    id: 'location-address',
    category: 'ubicacion',
    // 'donde'/'llegar' removed — too broad; transport-public handles those paths
    keywords: ['ubicacion', 'ubicados', 'direccion', 'donde quedan', 'donde estan ubicados', 'google maps'],
    answer:
      'Estamos en Camino A San Juan Yautepec s/n, La Cañada, La Marquesa, Estado de México — a 10 minutos de Santa Fe, CDMX. 📍 Búscanos en Google Maps como "Los Vagones La Marquesa".',
    priority: 2,
  },
  {
    id: 'location-distance',
    category: 'ubicacion',
    // 'minutos' alone removed — 'minutos de cdmx' is more specific
    keywords: ['lejos', 'distancia', 'minutos de cdmx', 'santa fe', 'cdmx', 'ciudad de mexico', 'carretera', 'toluca'],
    answer:
      'Estamos a solo 10 minutos de Santa Fe, CDMX, sobre la carretera México–Toluca en La Marquesa. Acceso fácil desde el Periférico o la autopista. 🚗',
  },
  {
    id: 'location-parking',
    category: 'ubicacion',
    // 'carro'/'auto'/'coche' removed — too broad, collide with transport intent
    keywords: ['estacionamiento', 'estacionar', 'parqueo', 'donde parqueo', 'parkeo'],
    answer:
      'Sí, contamos con estacionamiento privado y seguro incluido para nuestros huéspedes, sin costo adicional. 🅿️',
  },
  {
    id: 'transport-public',
    category: 'ubicacion',
    keywords: ['transporte', 'autobus', 'combi', 'uber', 'taxi', 'sin carro', 'sin auto', 'como llegar', 'llegar en transporte', 'transporte publico'],
    answer:
      'Puedes llegar en Uber o taxi desde CDMX (aprox. 30–40 min desde Santa Fe). No hay transporte público con parada directa al predio — recomendamos Uber o auto propio. 🚕',
    priority: 2,
  },

  // ── Reservaciones ──────────────────────────────────────────────────────────

  {
    id: 'checkin-time',
    category: 'reservaciones',
    keywords: ['check in', 'checkin', 'hora de entrada', 'hora de llegada', 'a que hora entro', 'a que hora llego', 'hora llegar'],
    answer:
      'El check-in es a partir de las 3:00 PM. Si llegas antes, con gusto guardamos tu equipaje mientras preparamos tu cabaña. 🕒',
    priority: 2,
  },
  {
    id: 'checkout-time',
    category: 'reservaciones',
    keywords: ['check out', 'checkout', 'hora de salida', 'a que hora salgo', 'cuando salgo', 'hora salida'],
    answer:
      'El check-out es a las 11:00 AM. Si necesitas salida tardía, consúltanos con anticipación — sujeto a disponibilidad. 🕚',
    priority: 2,
  },
  {
    id: 'cancellation',
    category: 'reservaciones',
    keywords: ['cancelar', 'cancelacion', 'devolucion', 'reembolso', 'politica cancelacion', 'cambiar fecha', 'cambio fecha'],
    answer:
      'Para cancelaciones o cambios de fecha, contáctanos directamente: 📞 +52 55 8284 3604 o ✉️ losvagonesmex@gmail.com. Hacemos lo posible por adaptarnos.',
  },
  {
    id: 'minimum-stay',
    category: 'reservaciones',
    keywords: ['minimo', 'noches minimas', 'cuantas noches minimas', 'solo una noche', 'noche minima'],
    answer:
      'Aceptamos reservas desde una noche. Aunque recomendamos al menos dos noches para aprovechar la experiencia al máximo. 🌲',
  },
  {
    id: 'age-limit',
    category: 'reservaciones',
    keywords: ['limite de edad', 'edad minima', 'menores solos', 'solo adultos', 'adultos unicamente', 'se aceptan menores'],
    answer:
      'No tenemos límite de edad — somos aptos para familias con niños de todas las edades. Los menores deben estar acompañados por un adulto responsable. 👨‍👩‍👧',
    priority: 2,
  },

  // ── Clima ──────────────────────────────────────────────────────────────────

  {
    id: 'weather',
    category: 'clima',
    // 'tiempo' removed — ambiguous (can mean "time", not just "weather")
    keywords: ['clima', 'temperatura', 'frio', 'calor', 'lluvia', 'llueve', 'como esta el clima', 'hace frio'],
    answer:
      'La Marquesa tiene clima de montaña: fresco de día (10–18 °C) y bastante frío de noche (3–8 °C). En temporada de lluvias (mayo–octubre) hay aguaceros por las tardes. ¡Trae ropa abrigadora! 🌲🧥',
    priority: 2,
  },
  {
    id: 'what-to-bring',
    category: 'clima',
    keywords: ['que traer', 'que llevar', 'que ropa traer', 'como vestirse', 'impermeable', 'chamarra'],
    answer:
      'Te recomendamos: 🧥 chamarra o abrigo (noches muy frías), ropa en capas, zapatos cómodos para caminar, y en temporada de lluvias un impermeable. ¡Y tu cámara para el bosque! 📷',
  },
  {
    id: 'best-season',
    category: 'clima',
    keywords: ['mejor epoca', 'mejor temporada', 'cuando ir', 'cuando visitar', 'mejor momento'],
    answer:
      'La mejor época es de noviembre a abril — cielos despejados y sin lluvia. En verano (mayo–oct.) hay lluvias vespertinas pero el bosque está exuberante. En diciembre–febrero puede nevar. ¡Cada temporada tiene su magia! ✨',
    priority: 2,
  },
  {
    id: 'snow',
    category: 'clima',
    keywords: ['nieve', 'nieva', 'hay nieve', 'cuando nieva'],
    answer:
      'Sí, en La Marquesa puede nevar entre diciembre y febrero. No está garantizado cada año, pero cuando ocurre es una experiencia espectacular. Trae ropa muy abrigadora si visitas en invierno. ❄️🌲',
    priority: 2,
  },

  // ── Actividades ────────────────────────────────────────────────────────────

  {
    id: 'activities',
    category: 'actividades',
    keywords: ['actividades', 'que hacer', 'que hay para hacer', 'que se puede hacer', 'entretenimiento'],
    answer:
      'En Los Vagones puedes disfrutar de: 🌲 caminatas por el bosque, fogatas privadas, observación de estrellas y descanso total. La zona de La Marquesa también ofrece actividades ecuestres y ciclismo de montaña. 🐴🚵',
    priority: 2,
  },
  {
    id: 'bonfire',
    category: 'actividades',
    // CONFLICT: Confirmar si leña es gratis o con costo extra antes de ajustar
    keywords: ['fogata', 'fogon', 'fuego', 'chimenea', 'lena', 'hoguera'],
    answer:
      'Sí, las cabañas cuentan con fogata. Consulta la disponibilidad de leña al reservar. 🔥',
    priority: 2,
  },
  {
    id: 'hiking',
    category: 'actividades',
    keywords: ['senderismo', 'caminatas', 'rutas', 'hiking', 'caminar', 'bosque', 'naturaleza'],
    answer:
      'Contamos con acceso a senderos en el bosque de La Marquesa. Ideal para caminatas con vistas espectaculares de montaña. 🥾🌲',
  },
  {
    id: 'kids-activities',
    category: 'actividades',
    // Multi-word phrases only — bare 'ninos' risks false-positive on availability queries
    keywords: ['actividades para ninos', 'hay para ninos', 'aptos para familias', 'familia con hijos', 'ninos pueden ir', 'con ninos'],
    answer:
      '¡Sí somos aptos para familias! Los niños disfrutan del bosque, fogatas y naturaleza. La zona de La Marquesa también tiene actividades ecuestres y ciclismo ideales para toda la familia. 👨‍👩‍👧‍👦🌲',
    priority: 2,
  },

  // ── Mascotas ───────────────────────────────────────────────────────────────

  {
    id: 'pets',
    category: 'mascotas',
    keywords: ['mascotas', 'perros', 'gatos', 'animales', 'mi perro', 'acepta mascotas', 'se permiten mascotas', 'puedo traer mi perro'],
    answer:
      '🐾 ¡Sí aceptamos mascotas! Solo avísanos al reservar y mantén a tu peludo en las áreas permitidas. Para los detalles, escríbenos al +52 55 8284 3604.',
    priority: 2,
  },

  // ── Pagos ──────────────────────────────────────────────────────────────────

  {
    id: 'payment-methods',
    category: 'pagos',
    keywords: ['como pago', 'formas de pago', 'tarjeta', 'efectivo', 'transferencia', 'metodos de pago', 'oxxo', 'paypal', 'pago en linea'],
    answer:
      'Aceptamos pago con tarjeta de crédito o débito (Visa, Mastercard) a través de nuestro sistema de reservas seguro, y transferencia bancaria. 💳',
    priority: 2,
  },
  {
    id: 'iva',
    category: 'pagos',
    // CONFLICT: Confirmar si precios incluyen IVA o se agrega al final
    keywords: ['iva', 'impuestos', 'precio incluye', 'precio final', 'cargos adicionales', 'precio total', 'impuesto', 'cargos ocultos'],
    answer:
      'Nuestros precios incluyen IVA. El monto que ves al reservar es el precio final, sin cargos ocultos. ✅',
    priority: 2,
  },
  {
    id: 'deposit',
    category: 'pagos',
    keywords: ['deposito', 'anticipo', 'cuando pago', 'cuando se cobra', 'pago completo', 'pago por adelantado'],
    answer:
      'El pago se realiza en línea al confirmar tu reserva. Recibirás tu confirmación por correo electrónico una vez completado. 📧',
  },
  {
    id: 'promotions',
    category: 'pagos',
    // 'oferta' alone removed — use 'oferta especial' to avoid broad false matches
    keywords: ['promocion', 'descuento', 'oferta especial', 'precio especial', 'codigo descuento', 'hay descuento', 'mejor precio'],
    answer:
      'Ocasionalmente tenemos promociones especiales. Para consultar descuentos o tarifas de temporada baja, escríbenos al 📞 +52 55 8284 3604 o ✉️ losvagonesmex@gmail.com. 🎁',
    priority: 2,
  },

  // ── Eventos ────────────────────────────────────────────────────────────────

  {
    id: 'events-weddings',
    category: 'eventos',
    // CONFLICT: Se han visto dos números de contacto para bodas — usando supportPhone del config
    keywords: ['boda', 'bodas', 'evento privado', 'celebracion', 'fiesta privada', 'xv anos', 'cumpleanos', 'aniversario', 'evento especial'],
    answer:
      '¡Organizamos bodas y eventos especiales! Para cotizaciones escríbenos: 📞 +52 55 8284 3604 o ✉️ losvagonesmex@gmail.com 💍',
    priority: 2,
  },
  {
    id: 'groups',
    category: 'eventos',
    keywords: ['grupo', 'grupos', 'muchas personas', 'empresa', 'retiro', 'team building', 'corporativo', 'reserva grupal'],
    answer:
      'Ofrecemos opciones para retiros y grupos corporativos. Para grupos de más de 10 personas, contáctanos al +52 55 8284 3604 para una cotización personalizada. 🏕️',
  },

  // ── Seguridad ──────────────────────────────────────────────────────────────

  {
    id: 'security',
    category: 'seguridad',
    keywords: ['seguro', 'seguridad', 'peligro', 'vigilancia', 'guardias', 'robo', 'es seguro', 'zona segura'],
    answer:
      'Los Vagones es un refugio privado con acceso controlado. La zona de La Marquesa es tranquila y familiar. 🔒',
    priority: 2,
  },
  {
    id: 'medical',
    category: 'seguridad',
    keywords: ['medico', 'hospital', 'clinica', 'farmacia', 'emergencia medica', 'primeros auxilios', 'doctor', 'urgencias'],
    answer:
      'La clínica más cercana está en Lerma o Santa Fe (aprox. 15–20 min). Contamos con botiquín de primeros auxilios en la propiedad. En emergencias, marca el 911. 🏥',
    priority: 2,
  },
  {
    id: 'smoking',
    category: 'seguridad',
    keywords: ['fumar', 'cigarro', 'cigarros', 'tabaco', 'se puede fumar', 'vapear', 'vaper'],
    answer:
      'No se permite fumar dentro de las cabañas. Contamos con áreas exteriores designadas para fumadores. Agradecemos respetar el entorno natural del bosque. 🚭',
    priority: 2,
  },

  // ── Servicios ──────────────────────────────────────────────────────────────

  {
    id: 'cleaning',
    category: 'servicios',
    keywords: ['limpieza', 'limpian', 'servicio de limpieza', 'cambio de sabanas', 'cambio de toallas', 'aseo', 'limpieza diaria'],
    answer:
      'Incluimos limpieza y cambio de ropa de cama entre estancias. Para estancias de varias noches, el servicio de limpieza se realiza a solicitud — avísanos y con gusto coordinamos. 🧹',
    priority: 2,
  },
  {
    id: 'hot-water',
    category: 'servicios',
    // CONFLICT: Confirmar si el agua caliente es efectivamente 24h en todas las cabañas
    keywords: ['agua caliente', 'regadera caliente', 'ducha caliente', 'bano caliente', 'agua fria', 'hay agua caliente'],
    answer:
      'Sí, todas las cabañas tienen agua caliente las 24 horas. Ducha caliente garantizada aun con las noches frías de La Marquesa. 🚿',
    priority: 2,
  },

  // ── Alimentos ──────────────────────────────────────────────────────────────

  {
    id: 'food-restaurant',
    category: 'alimentos',
    keywords: ['restaurante', 'restaurant', 'comida', 'cenar', 'cena', 'almuerzo', 'alimentos disponibles', 'hay comida'],
    answer:
      'Las cabañas cuentan con cocina equipada para que prepares tus propios alimentos. También hay restaurantes y tiendas cerca en La Marquesa. 🍽️',
    priority: 2,
  },
  {
    id: 'food-breakfast',
    category: 'alimentos',
    keywords: ['desayuno incluido', 'incluye desayuno', 'esta incluido el desayuno', 'desayuno gratis', 'breakfast included'],
    answer:
      'El desayuno no está incluido en la tarifa, pero las cabañas tienen cocina equipada para que lo prepares. También puedes encontrar opciones en La Marquesa. 🥐',
    priority: 2,
  },
  {
    id: 'food-bring-own',
    category: 'alimentos',
    keywords: ['traer comida', 'llevar comida', 'traer bebidas', 'alcohol', 'carne asada', 'asador', 'parrilla', 'botanear'],
    answer:
      '¡Claro! Puedes traer tus propios alimentos y bebidas. Las cabañas cuentan con parrilla y área de asador. 🥩🍺',
  },
  {
    id: 'kitchen',
    category: 'alimentos',
    keywords: ['tienen cocina', 'hay cocina', 'cocinar', 'microondas', 'refrigerador', 'estufa', 'utensilios cocina', 'cocina equipada'],
    answer:
      'Sí, las cabañas cuentan con cocina equipada: estufa, refrigerador, microondas y utensilios básicos. Puedes preparar tus propios alimentos con total comodidad. 🍳',
    priority: 2,
  },
  {
    id: 'grocery-nearby',
    category: 'alimentos',
    keywords: ['supermercado', 'viveres', 'provisiones', 'abarrotes', 'donde compro', 'tienda de abarrotes', 'comprar comida cerca'],
    answer:
      'Hay tiendas y pequeños comercios en La Marquesa a pocos minutos. Te recomendamos traer víveres desde la ciudad — la selección local es limitada. 🛒',
    priority: 2,
  },

  // ── WiFi ───────────────────────────────────────────────────────────────────

  {
    id: 'wifi',
    category: 'wifi',
    // CONFLICT: Confirmar cobertura exacta — ¿WiFi en cabañas? ¿Solo áreas comunes? ¿Sin WiFi?
    keywords: ['wifi', 'wi fi', 'internet', 'conexion', 'trabajo remoto', 'trabajar remoto', 'hay internet'],
    answer:
      'Contamos con WiFi en áreas comunes. La señal puede variar en zona de montaña. Si trabajas en línea, te recomendamos traer datos móviles de respaldo. 📶',
    priority: 2,
  },
];
