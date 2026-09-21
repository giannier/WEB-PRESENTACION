/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run covers:scan`, which runs automatically before `dev` and
 * `build`. To give a company its artwork, drop a file into `public/portadas` named
 * after its slug: `trustagroexport.webp`, `zentek360.mp4`, and so on.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {
  abubu: { type: 'image', src: '/portadas/abubu.webp' },
  agrosumak: { type: 'image', src: '/portadas/agrosumak.webp' },
  aguayanayacu: { type: 'image', src: '/portadas/aguayanayacu.webp' },
  arbicop: { type: 'image', src: '/portadas/arbicop.webp' },
  convive360: { type: 'image', src: '/portadas/convive360.webp' },
  corporacionyanayacu: { type: 'image', src: '/portadas/corporacionyanayacu.webp' },
  parkeatcar: { type: 'image', src: '/portadas/parkeatcar.webp' },
  quantukperu: { type: 'image', src: '/portadas/quantukperu.webp' },
  rekuperat: { type: 'image', src: '/portadas/rekuperat.webp' },
  somosescuelacapacita: { type: 'image', src: '/portadas/somosescuelacapacita.webp' },
  somostributa: { type: 'image', src: '/portadas/somostributa.webp' },
  ssomasafe: { type: 'image', src: '/portadas/ssomasafe.webp' },
  supplylogistic360: { type: 'image', src: '/portadas/supplylogistic360.webp' },
  surelife360: { type: 'image', src: '/portadas/surelife360.webp' },
  trustagroexport: { type: 'image', src: '/portadas/trustagroexport.webp' },
  tuperfil360: { type: 'image', src: '/portadas/tuperfil360.webp' },
  yanayacuclean: { type: 'image', src: '/portadas/yanayacuclean.webp' },
  ynsumedic: { type: 'image', src: '/portadas/ynsumedic.webp' },
  zentek360: { type: 'image', src: '/portadas/zentek360.webp' },
};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
