/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by `npm run covers:scan`, which runs automatically before `dev` and
 * `build`. To give a company its artwork, drop a file into `public/portadas` named
 * after its slug: `trustagroexport.webp`, `zentek360.mp4`, and so on.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {
  trustagroexport: { type: 'image', src: '/portadas/trustagroexport.webp' },
};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
