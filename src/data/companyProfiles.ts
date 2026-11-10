/**
 * Showcase content for the left panel, keyed by company slug.
 *
 * The headline is split into three parts so the middle one can be painted in the
 * company's brand colour without any HTML inside a string:
 *
 *   lead       "Conectamos"
 *   highlight  "TALENTO Y RECURSOS,"        <- brand colour
 *   tail       "IMPULSAMOS EL DESARROLLO DE NUESTRO PAÍS"
 *
 * Copy, phones and emails were taken from each company's own website, so they are the
 * wording each business already uses publicly. Review them before a real launch —
 * anything a site did not publish is noted below.
 */

export type ShowcaseMedia = {
  readonly type: 'image' | 'video';
  readonly src: string;
  /** Poster frame for a video, shown while it loads. */
  readonly poster?: string;
};

export type CompanyProfile = {
  readonly lead: string;
  readonly highlight: string;
  readonly tail: string;
  readonly subtitle: string;
  readonly phone: string;
  readonly email: string;
  /**
   * Optional override. Normally artwork is picked up automatically from
   * `public/portadas/<slug>.<ext>`; set this only to point somewhere else.
   */
  readonly media?: ShowcaseMedia;
};

export const COMPANY_PROFILES: Readonly<Record<string, CompanyProfile>> = {
  somosescuelacapacita: {
    lead: 'Encuentra',
    highlight: 'LA CERTIFICACIÓN',
    tail: 'QUE NECESITAS',
    subtitle: 'Formación y certificación profesional para el trabajo real',
    phone: '+51 974 667 498',
    email: '',
  },
  arbicop: {
    lead: 'Tu crecimiento',
    highlight: 'EMPIEZA HOY',
    tail: '',
    subtitle: 'Instituto de formación para peritos, árbitros, conciliadores y tasadores',
    phone: '+51 961 192 192',
    email: 'comercial@arbicop.com',
  },
  convive360: {
    lead: 'El lugar donde',
    highlight: 'TU VIDA CRECE',
    tail: '',
    subtitle: 'Asesoramiento integral para tu nueva propiedad',
    phone: '+51 967 285 628',
    email: 'comercial@convive360.com',
  },
  aguayanayacu: {
    lead: 'El agua',
    highlight: 'QUE ENAMORA',
    tail: '',
    subtitle: 'Agua de mesa premium: Essential, Alcalina y Performance',
    phone: '+51 943 704 298',
    email: 'comercial@aguayanayacu.com',
  },
  yanayacuclean: {
    lead: 'El brillo y aroma',
    highlight: 'QUE ATRAPAN',
    tail: '',
    subtitle: 'Limpieza de alta concentración para hogar e industria',
    phone: '+51 943 704 298',
    email: 'comercial@yanayacuclean.com',
  },
  zentek360: {
    lead: 'Software para cada empresa,',
    highlight: '',
    tail: '',
    subtitle: 'Sistemas a medida, automatización e inteligencia artificial',
    phone: '+51 964 155 242',
    email: 'comercial@zentek360.com',
  },
  surelife360: {
    lead: 'Blindamos',
    highlight: 'EL FUTURO',
    tail: 'DE SU ORGANIZACIÓN',
    subtitle: 'Corredores de seguros: SCTR, Vida Ley, EPS y responsabilidad civil',
    phone: '+51 943 704 298',
    email: 'comercial@surelife360.com',
  },
  agrosumak: {
    lead: 'Producción pecuaria global',
    highlight: 'CON ESTÁNDARES',
    tail: 'DE EXCELENCIA',
    subtitle: 'Genética, producción y exportación pecuaria premium',
    phone: '+51 943 704 298',
    email: 'comercial@agrosumak.com',
  },
  ssomasafe: {
    lead: 'Blindamos',
    highlight: 'LA SEGURIDAD',
    tail: 'Y CONTINUIDAD OPERATIVA',
    subtitle: 'Consultoría en seguridad y salud en el trabajo, y EPP certificados',
    // Shared management line across the group — confirmed by the user. The same number
    // appears on quantukperu, abubu, corporacionyanayacu, ynsumedic, agrosumak,
    // aguayanayacu, yanayacuclean, surelife360, rekuperat and somostributa.
    phone: '+51 943 704 298',
    email: 'comercial@ssomasafe.com',
  },
  trustagroexport: {
    lead: 'Impulsamos el campo,',
    highlight: '',
    tail: '',
    subtitle: 'Fertilizantes, maquinaria e insumos para el agro exportador',
    phone: '+51 987 664 321',
    email: 'comercial@trustagroexport.com',
  },
  abubu: {
    lead: 'Todo para',
    highlight: 'CONSENTIR',
    tail: 'A TU BEBÉ',
    subtitle: 'Ropa, accesorios y juguetes con envíos a todo el Perú',
    phone: '+51 943 704 298',
    email: 'comercial@abubu.com.pe',
  },
  supplylogistic360: {
    lead: 'La cadena de suministro',
    highlight: 'COMPLETA',
    tail: '',
    subtitle: 'Del proveedor de tu proveedor al cliente de tu cliente',
    phone: '+51 994 693 529',
    email: 'comercial@supplylogistic360.com',
  },
  corporacionyanayacu: {
    lead: '',
    highlight: '',
    tail: 'IMPULSAMOS EL DESARROLLO DE NUESTRO PAÍS',
    subtitle: 'Soluciones integrales para un futuro sostenible',
    phone: '+51 943 704 298',
    email: 'comercial@corporacionyanayacu.com',
  },
  tuperfil360: {
    lead: 'Reclutamos.',
    highlight: 'AUTOMATIZAMOS.',
    tail: 'ACOMPAÑAMOS.',
    subtitle: 'Gestión integral del talento humano y outsourcing de planillas',
    phone: '+51 900 791 453',
    email: 'comercial@tuperfil360.com',
  },
  somostributa: {
    // PLACEHOLDER copy and email: somostributa.com serves an empty directory listing,
    // so there was no published wording to take. Replace once the site is live. The
    // phone is real — the shared group line, confirmed by the user.
    lead: 'Tu empresa',
    highlight: 'AL DÍA',
    tail: 'CON SUS OBLIGACIONES',
    subtitle: 'Asesoría contable y tributaria para empresas',
    phone: '+51 943 704 298',
    email: '',
  },
  parkeatcar: {
    lead: 'Tu garaje vacío',
    highlight: 'TRABAJA PARA TI',
    tail: '',
    subtitle: 'Reserva o alquila estacionamiento en segundos',
    phone: '',
    email: 'comercial@parkeatcar.com',
  },
  rekuperat: {
    lead: '',
    highlight: 'RECUPERACIÓN FINANCIERA',
    tail: 'Y EL COMPLIANCE',
    subtitle: 'Cobranza omnicanal con inteligencia artificial bajo normativa SBS',
    phone: '+51 943 704 298',
    email: 'comercial@rekuperat.com',
  },
  ynsumedic: {
    lead: 'Soluciones médicas corporativas',
    highlight: 'DE ALTA PRECISIÓN',
    tail: '',
    subtitle: 'Suministros médicos y salud ocupacional para empresas',
    phone: '+51 943 704 298',
    email: 'comercial@ynsumedic.com',
  },
  quantukperu: {
    lead: 'Fortalecemos',
    highlight: 'LA ESTRUCTURA Y EL ORDEN',
    tail: 'DE TU EMPRESA',
    subtitle: 'Compliance corporativo, sistemas ISO y mejora continua',
    phone: '+51 943 704 298',
    email: 'comercial@quantukperu.com',
  },
};

const FALLBACK_PROFILE: CompanyProfile = {
  lead: '',
  highlight: '',
  tail: '',
  subtitle: '',
  phone: '',
  email: '',
};

export function profileFor(slug: string): CompanyProfile {
  return COMPANY_PROFILES[slug] ?? FALLBACK_PROFILE;
}
