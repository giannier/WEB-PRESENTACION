/**
 * Official social profiles per company, keyed by company slug.
 *
 * Seeded from the links each company publishes on its own website, which is the most
 * reliable proof that an account is the official one. Template placeholder numbers
 * found on some sites (e.g. `wa.me/51999999999`) were deliberately left out.
 *
 * Companies with an empty object had no social links on their website at the time of
 * seeding. Add their profiles here; the QR page picks them up automatically.
 */

export type SocialNetwork = 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'linkedin' | 'x' | 'whatsapp';

export type CompanySocials = Partial<Record<SocialNetwork, string>>;

export type SocialLink = {
  readonly network: SocialNetwork;
  readonly url: string;
};

/** Display order on the QR page: the networks people most often follow come first. */
export const SOCIAL_NETWORK_ORDER: readonly SocialNetwork[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'x',
  'whatsapp',
];

export const COMPANY_SOCIALS: Readonly<Record<string, CompanySocials>> = {
  somosescuelacapacita: {
    instagram: 'https://www.instagram.com/somosescuelacapacita',
    facebook: 'https://www.facebook.com/somosescuelacapacita',
    tiktok: 'https://www.tiktok.com/@somosescuelacapacita',
    youtube: 'https://www.youtube.com/@somosescuelacapacita',
  },
  arbicop: {},
  convive360: {
    facebook: 'https://www.facebook.com/profile.php?id=61588380241686',
    whatsapp: 'https://wa.me/51920062207',
  },
  aguayanayacu: {
    instagram: 'https://www.instagram.com/aguayanayacu',
    facebook: 'https://www.facebook.com/profile.php?id=61588086203401',
    tiktok: 'https://www.tiktok.com/@agua.yanayacu',
    youtube: 'https://www.youtube.com/@agua.yanayacu',
    whatsapp: 'https://wa.me/51974667498',
  },
  yanayacuclean: {
    instagram: 'https://www.instagram.com/yanayacu.clean',
    facebook: 'https://www.facebook.com/profile.php?id=61587992521138',
    tiktok: 'https://www.tiktok.com/@yanayacuclean',
    youtube: 'https://www.youtube.com/@yanayacucleanperu',
    whatsapp: 'https://wa.me/51974667498',
  },
  zentek360: {
    whatsapp: 'https://wa.me/51964155424',
  },
  surelife360: {
    instagram: 'https://www.instagram.com/life360.pe',
    facebook: 'https://www.facebook.com/profile.php?id=61589863426707',
    tiktok: 'https://www.tiktok.com/@life360.pe',
    youtube: 'https://www.youtube.com/@Life360peru',
  },
  agrosumak: {
    instagram: 'https://www.instagram.com/sumak.agropecuaria',
    facebook: 'https://www.facebook.com/profile.php?id=61590144242985',
    tiktok: 'https://www.tiktok.com/@sumak.agropecuaria',
    youtube: 'https://www.youtube.com/@Sumak.Agropecuaria',
  },
  ssomasafe: {
    whatsapp: 'https://wa.me/51967285628',
  },
  trustagroexport: {},
  abubu: {},
  supplylogistic360: {
    instagram: 'https://www.instagram.com/supply360.pe',
    facebook: 'https://www.facebook.com/profile.php?id=61589657582574',
    tiktok: 'https://www.tiktok.com/@supply.360',
    youtube: 'https://www.youtube.com/@supply360_peru',
  },
  corporacionyanayacu: {},
  tuperfil360: {
    instagram: 'https://www.instagram.com/tuperfil360',
    facebook: 'https://www.facebook.com/profile.php?id=61590079145377',
    tiktok: 'https://www.tiktok.com/@tuperfil360',
    youtube: 'https://www.youtube.com/@TuPerfil360',
  },
  somostributa: {},
  parkeatcar: {},
  rekuperat: {
    instagram: 'https://www.instagram.com/rekuperat',
    facebook: 'https://www.facebook.com/profile.php?id=61589970911068',
    tiktok: 'https://www.tiktok.com/@rekuperat',
    youtube: 'https://www.youtube.com/channel/UCdSwRyLhpWjsanbmj6lQZhw',
  },
  ynsumedic: {
    instagram: 'https://www.instagram.com/ynsumedic',
    facebook: 'https://www.facebook.com/profile.php?id=61590267059171',
    tiktok: 'https://www.tiktok.com/@ynsumedic',
    youtube: 'https://www.youtube.com/@Ynsumedic',
  },
  quantukperu: {
    whatsapp: 'https://wa.me/51943704298',
  },
};

/** The company's profiles as an ordered list, skipping networks it does not use. */
export function socialLinksFor(slug: string): SocialLink[] {
  const socials = COMPANY_SOCIALS[slug] ?? {};
  return SOCIAL_NETWORK_ORDER.flatMap((network) => {
    const url = socials[network];
    return url === undefined ? [] : [{ network, url }];
  });
}
