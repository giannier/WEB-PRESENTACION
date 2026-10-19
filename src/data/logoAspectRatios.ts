/**
 * GENERATED FILE — do not edit by hand.
 * Run `npm run logos:optimize` to regenerate from the trimmed logos in public/logos.
 *
 * Width ÷ height of each logo's real artwork, after the optimizer trims away the
 * transparent padding the source PNGs ship with. A value above 1 is wider than tall.
 * Use this wherever a logo is placed into a fixed box, so it can be sized to fit
 * without stretching — the browser has no way to measure an image's shape from its
 * file path alone.
 */
export const LOGO_ASPECT_RATIOS: Readonly<Record<string, number>> = {
  abubu: 2.8481,
  agrosumak: 1.8241,
  aguayanayacu: 2.0775,
  arbicop: 3.1043,
  convive360: 1.2066,
  corporacionyanayacu: 1.2503,
  parkeatcar: 1.9690,
  quantukperu: 2.1538,
  rekuperat: 2.1658,
  somosescuelacapacita: 1.6071,
  somostributa: 1.5556,
  ssomasafe: 1.4667,
  supplylogistic360: 2.5760,
  surelife360: 1.4132,
  trustagroexport: 2.4298,
  tuperfil360: 2.9245,
  yanayacuclean: 2.4335,
  ynsumedic: 1.1884,
  zentek360: 3.0296,
};

/** Falls back to square when a company has no entry yet. */
export function logoAspectRatio(slug: string): number {
  return LOGO_ASPECT_RATIOS[slug] ?? 1;
}
