/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run portfolio:scan`, which runs automatically before `dev` and
 * `build`. To give a company a portfolio, drop images or PDFs into
 * `public/portafolio/<slug>/` — any file name, any count.
 */

export type PortfolioItem = {
  readonly type: 'image' | 'pdf';
  readonly src: string;
  readonly name: string;
};

export const COMPANY_PORTFOLIO: Readonly<Record<string, readonly PortfolioItem[]>> = {
  rekuperat: [
    { type: 'image', src: '/portafolio/rekuperat/1.webp', name: '1' },
  ],
  somostributa: [
    { type: 'image', src: '/portafolio/somostributa/1.webp', name: '1' },
  ],
  ssomasafe: [
    { type: 'image', src: '/portafolio/ssomasafe/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/ssomasafe/2.webp', name: '2' },
  ],
  trustagroexport: [
    { type: 'image', src: '/portafolio/trustagroexport/1.webp', name: '1' },
  ],
  tuperfil360: [
    { type: 'image', src: '/portafolio/tuperfil360/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/tuperfil360/2.webp', name: '2' },
    { type: 'image', src: '/portafolio/tuperfil360/3.webp', name: '3' },
  ],
};

export function portfolioFor(slug: string): readonly PortfolioItem[] {
  return COMPANY_PORTFOLIO[slug] ?? [];
}
