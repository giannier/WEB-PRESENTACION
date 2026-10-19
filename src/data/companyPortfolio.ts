/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run portfolio:scan`, which runs automatically before `dev` and
 * `build`. To give a company a portfolio, drop images, videos or PDFs into
 * `public/portafolio/<slug>/` — any file name, any count.
 */

export type PortfolioItem = {
  readonly type: 'image' | 'pdf' | 'video';
  readonly src: string;
  readonly name: string;
};

export const COMPANY_PORTFOLIO: Readonly<Record<string, readonly PortfolioItem[]>> = {
  agrosumak: [
    { type: 'image', src: '/portafolio/agrosumak/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/agrosumak/2.webp', name: '2' },
  ],
  aguayanayacu: [
    { type: 'image', src: '/portafolio/aguayanayacu/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/aguayanayacu/2.webp', name: '2' },
    { type: 'video', src: '/portafolio/aguayanayacu/video1.mp4', name: 'video1' },
  ],
  corporacionyanayacu: [
    { type: 'image', src: '/portafolio/corporacionyanayacu/1.webp', name: '1' },
  ],
  quantukperu: [
    { type: 'image', src: '/portafolio/quantukperu/1.webp', name: '1' },
  ],
  rekuperat: [
    { type: 'image', src: '/portafolio/rekuperat/2.webp', name: '2' },
  ],
  somosescuelacapacita: [
    { type: 'image', src: '/portafolio/somosescuelacapacita/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/somosescuelacapacita/2.webp', name: '2' },
    { type: 'image', src: '/portafolio/somosescuelacapacita/3.webp', name: '3' },
    { type: 'video', src: '/portafolio/somosescuelacapacita/video1.mp4', name: 'video1' },
    { type: 'video', src: '/portafolio/somosescuelacapacita/video2.mp4', name: 'video2' },
  ],
  somostributa: [
    { type: 'image', src: '/portafolio/somostributa/1.webp', name: '1' },
  ],
  ssomasafe: [
    { type: 'image', src: '/portafolio/ssomasafe/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/ssomasafe/2.webp', name: '2' },
    { type: 'pdf', src: '/portafolio/ssomasafe/CAT%C3%81LOGO%20SSOMA.pdf', name: 'CATÁLOGO SSOMA' },
    { type: 'video', src: '/portafolio/ssomasafe/video1.mp4', name: 'video1' },
  ],
  supplylogistic360: [
    { type: 'image', src: '/portafolio/supplylogistic360/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/supplylogistic360/2.webp', name: '2' },
  ],
  trustagroexport: [
    { type: 'image', src: '/portafolio/trustagroexport/1.webp', name: '1' },
  ],
  tuperfil360: [
    { type: 'image', src: '/portafolio/tuperfil360/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/tuperfil360/2.webp', name: '2' },
    { type: 'image', src: '/portafolio/tuperfil360/3.webp', name: '3' },
  ],
  yanayacuclean: [
    { type: 'image', src: '/portafolio/yanayacuclean/1.webp', name: '1' },
    { type: 'image', src: '/portafolio/yanayacuclean/2.webp', name: '2' },
    { type: 'image', src: '/portafolio/yanayacuclean/3.webp', name: '3' },
    { type: 'image', src: '/portafolio/yanayacuclean/4.webp', name: '4' },
    { type: 'pdf', src: '/portafolio/yanayacuclean/CAT%C3%81LOGO%20YANA%20YACU%20CLEAN.pdf', name: 'CATÁLOGO YANA YACU CLEAN' },
  ],
  ynsumedic: [
    { type: 'image', src: '/portafolio/ynsumedic/1.webp', name: '1' },
  ],
  zentek360: [
    { type: 'image', src: '/portafolio/zentek360/1.png', name: '1' },
    { type: 'image', src: '/portafolio/zentek360/2.png', name: '2' },
    { type: 'image', src: '/portafolio/zentek360/3.webp', name: '3' },
    { type: 'image', src: '/portafolio/zentek360/4.webp', name: '4' },
    { type: 'image', src: '/portafolio/zentek360/5.webp', name: '5' },
    { type: 'image', src: '/portafolio/zentek360/6.webp', name: '6' },
    { type: 'image', src: '/portafolio/zentek360/7.webp', name: '7' },
    { type: 'image', src: '/portafolio/zentek360/8.webp', name: '8' },
    { type: 'image', src: '/portafolio/zentek360/9.webp', name: '9' },
  ],
};

export function portfolioFor(slug: string): readonly PortfolioItem[] {
  return COMPANY_PORTFOLIO[slug] ?? [];
}
