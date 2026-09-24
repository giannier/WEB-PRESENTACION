/**
 * Canonical registry of the business units rendered on the 3D wheel.
 *
 * INVARIANT: `slug` must match the file name of the logo in `public/logos/<slug>.png`.
 * Adding or removing an entry is the only change required to grow or shrink the wheel;
 * every angular calculation is derived from `COMPANIES.length`.
 */
export type Company = {
  readonly slug: string;
  readonly name: string;
  readonly url: string;
};

/**
 * ORDER MATTERS. This is the running order for the trade fair, and the first entry is
 * what the wheel opens on: the parent corporation, followed by the businesses that lead
 * the pitch. The remaining companies keep their previous relative order.
 *
 * Changing the order here changes the wheel, the counter and nothing else — every other
 * dataset (colours, profiles, socials) is keyed by slug.
 */
export const COMPANIES: readonly Company[] = [
  // Opening sequence, in the order the fair was planned around.
  { slug: 'corporacionyanayacu', name: 'Corporación Yanayacu', url: 'https://corporacionyanayacu.com' },
  { slug: 'trustagroexport', name: 'Trust Agroexport', url: 'https://trustagroexport.com' },
  { slug: 'zentek360', name: 'Zentek 360', url: 'https://zentek360.com' },
  { slug: 'ssomasafe', name: 'SSOMA Safe', url: 'https://ssomasafe.com' },
  { slug: 'agrosumak', name: 'Agrosumak', url: 'https://agrosumak.com' },
  { slug: 'supplylogistic360', name: 'Supply Logistic 360', url: 'https://supplylogistic360.com' },
  { slug: 'quantukperu', name: 'Quantuk Perú', url: 'https://quantukperu.com' },
  { slug: 'tuperfil360', name: 'Tu Perfil 360', url: 'https://tuperfil360.com' },
  { slug: 'surelife360', name: 'Surelife 360', url: 'https://surelife360.com' },
  { slug: 'parkeatcar', name: 'Parkeat Car', url: 'https://parkeatcar.com' },

  // The rest of the ecosystem.
  { slug: 'somosescuelacapacita', name: 'Escuela Capacita', url: 'https://somosescuelacapacita.com' },
  { slug: 'arbicop', name: 'Arbicop', url: 'https://arbicop.com' },
  { slug: 'convive360', name: 'Convive 360', url: 'https://convive360.com' },
  { slug: 'aguayanayacu', name: 'Agua Yanayacu', url: 'https://aguayanayacu.com' },
  { slug: 'yanayacuclean', name: 'Yanayacu Clean', url: 'https://yanayacuclean.com' },
  { slug: 'abubu', name: 'Abubu', url: 'https://abubu.com.pe' },
  { slug: 'somostributa', name: 'Tributa', url: 'https://somostributa.com' },
  { slug: 'rekuperat', name: 'Rekuperat', url: 'https://rekuperat.com' },
  { slug: 'ynsumedic', name: 'Ynsumedic', url: 'https://ynsumedic.com' },
] as const;

/** Resolves the public texture path for a company slug. */
export function getLogoPath(slug: string): string {
  return `/logos/${slug}.png`;
}

/**
 * Stable, mutable copy of every texture URL.
 * `useTexture` / `useLoader` require a mutable array, and the identity must be stable
 * across renders so the suspense cache key never changes.
 */
export const LOGO_PATHS: string[] = COMPANIES.map((company) => getLogoPath(company.slug));

export const COMPANY_COUNT = COMPANIES.length;
