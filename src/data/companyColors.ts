/**
 * GENERATED FILE — do not edit by hand.
 * Run `npm run colors:extract` to regenerate from the logos in public/logos.
 *
 * One brand colour per company, derived from the dominant chromatic hue of its own
 * logo and normalised into a saturation/lightness band that stays legible as a filled
 * sector behind white text.
 */
export const COMPANY_COLORS: Readonly<Record<string, string>> = {
  'somosescuelacapacita': '#ebbd33',
  'arbicop': '#115ea7',
  'convive360': '#1211a7',
  'aguayanayacu': '#1136a7',
  'yanayacuclean': '#113aa7',
  'zentek360': '#c64b14',
  'surelife360': '#1ccec7',
  'agrosumak': '#5d3285',
  'ssomasafe': '#4194dc',
  'trustagroexport': '#229665',
  'abubu': '#2f5190',
  'supplylogistic360': '#eb6333',
  'corporacionyanayacu': '#11a755',
  'tuperfil360': '#1140a7',
  'somostributa': '#d64c41',
  'parkeatcar': '#c51420',
  'rekuperat': '#e8d517',
  'ynsumedic': '#1e5499',
  'quantukperu': '#eb333c',
};

/** Fallback for a slug with no generated colour. */
export const DEFAULT_COMPANY_COLOR = '#64748b';

export function companyColor(slug: string): string {
  return COMPANY_COLORS[slug] ?? DEFAULT_COMPANY_COLOR;
}
