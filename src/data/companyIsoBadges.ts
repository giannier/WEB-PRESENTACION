/**
 * ISO certification badges per company, keyed by slug.
 *
 * Same convention as the wheel logos: the file for a slug lives at
 * `public/isos/<slug>.png`, so adding a badge for another company is dropping the PNG
 * into `public/isos` and adding one line here. A company without an entry simply
 * renders no badge in the showcase header.
 */
export const COMPANY_ISO_BADGES: Readonly<Record<string, string>> = {
  corporacionyanayacu: '/isos/corporacionyanayacu.png',
};

export function isoBadgeFor(slug: string): string | undefined {
  return COMPANY_ISO_BADGES[slug];
}
