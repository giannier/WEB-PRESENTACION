/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run covers:scan`, which runs automatically before `dev` and
 * `build`. To give a company its artwork, drop a file into `public/portadas` named
 * after its slug: `trustagroexport.webp`, `zentek360.mp4`, and so on.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {
  agrosumak: { type: 'image', src: '/portadas/agrosumak.webp' },
  aguayanayacu: { type: 'image', src: '/portadas/aguayanayacu.webp' },
  arbicop: { type: 'image', src: '/portadas/arbicop.webp' },
  corporacionyanayacu: { type: 'image', src: '/portadas/corporacionyanayacu.webp' },
  quantukperu: { type: 'image', src: '/portadas/quantukperu.webp' },
  somosescuelacapacita: { type: 'image', src: '/portadas/somosescuelacapacita.webp' },
  ssomasafe: { type: 'image', src: '/portadas/ssomasafe.webp' },
  supplylogistic360: { type: 'image', src: '/portadas/supplylogistic360.webp' },
  surelife360: { type: 'image', src: '/portadas/surelife360.webp' },
  trustagroexport: { type: 'image', src: '/portadas/trustagroexport.webp' },
  tuperfil360: { type: 'image', src: '/portadas/tuperfil360.webp' },
  yanayacuclean: { type: 'image', src: '/portadas/yanayacuclean.webp' },
  zentek360: { type: 'image', src: '/portadas/zentek360.webp' },
};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
