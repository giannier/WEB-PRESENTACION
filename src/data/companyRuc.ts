/**
 * RUC (Registro Único de Contribuyentes) per company, keyed by slug.
 *
 * Sourced from the client's own SUNAT lookup table, not scraped from each company's
 * site — unlike `companyProfiles.ts`, there is no public page to cross-check this
 * against. A company missing here simply shows no RUC in the HUD; six of the nineteen
 * (tuperfil360, surelife360, abubu, somostributa, rekuperat, ynsumedic) had no RUC in
 * that table and are deliberately left out rather than guessed.
 */
export const COMPANY_RUC: Readonly<Record<string, string>> = {
  corporacionyanayacu: '20608600991',
  somosescuelacapacita: '20605956000',
  agrosumak: '20613184491',
  aguayanayacu: '20615455262',
  convive360: '20614136643',
  yanayacuclean: '20615474755',
  supplylogistic360: '20615946207',
  ssomasafe: '20607018287',
  quantukperu: '20614465728',
  parkeatcar: '20615720349',
  zentek360: '20616110099',
  arbicop: '20614105829',
  trustagroexport: '20616573552',
};

export function rucFor(slug: string): string | undefined {
  return COMPANY_RUC[slug];
}
