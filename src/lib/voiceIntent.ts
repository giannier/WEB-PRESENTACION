/**
 * Turns one recognised utterance into a navigation command.
 *
 * Pure and framework-free on purpose: it is the one piece of this feature worth being
 * able to read and adjust without touching the microphone/React plumbing around it.
 * Matching is deliberately conservative — an utterance that does not clearly resolve to
 * a company or an action returns `{ type: 'none' }` rather than guessing, since this
 * runs continuously in a noisy hall and picks up plenty of speech that was never meant
 * as a command.
 */
import { COMPANIES, type Company } from '@/data/companies';

export type VoiceCommand =
  | { readonly type: 'select-company'; readonly company: Company }
  | { readonly type: 'open-portfolio'; readonly company: Company | null }
  | { readonly type: 'open-catalog'; readonly company: Company | null }
  | { readonly type: 'open-qr' }
  | { readonly type: 'open-form' }
  | { readonly type: 'open-website' }
  | { readonly type: 'next' }
  | { readonly type: 'previous' }
  | { readonly type: 'close' }
  | { readonly type: 'none' };

function normalise(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words too short or too common to distinguish companies on their own ("360", "de"). */
const MIN_TOKEN_LENGTH = 4;

type CompanyCandidate = { readonly company: Company; readonly token: string };

const CANDIDATES: readonly CompanyCandidate[] = COMPANIES.flatMap((company) => {
  const fullName = normalise(company.name);
  const words = fullName.split(' ').filter((word) => word.length >= MIN_TOKEN_LENGTH);
  const tokens = new Set([fullName, company.slug, ...words]);
  return [...tokens].map((token) => ({ company, token }));
});

/**
 * Finds the company whose name best overlaps the utterance. "Best" is the longest
 * matching token; a tie between two different companies (both Yanayacu businesses
 * matched on "yanayacu" alone, say) resolves to no match rather than guessing wrong.
 */
function matchCompany(utterance: string): Company | null {
  let best: { readonly company: Company; readonly length: number } | null = null;
  let tied = false;

  for (const { company, token } of CANDIDATES) {
    if (!utterance.includes(token)) continue;
    if (best === null || token.length > best.length) {
      best = { company, length: token.length };
      tied = false;
    } else if (token.length === best.length && company.slug !== best.company.slug) {
      tied = true;
    }
  }

  return best !== null && !tied ? best.company : null;
}

const CATALOG_WORDS = ['catalogo'];
const PORTFOLIO_WORDS = ['portafolio', 'portfolio'];
const QR_WORDS = ['qr', 'codigo qr'];
const FORM_WORDS = ['formulario', 'registrar contacto'];
const WEBSITE_WORDS = ['sitio web', 'pagina web', 'abrir la web', 'ingresar a la web'];
const NEXT_WORDS = ['siguiente', 'proxima empresa', 'proximo'];
const PREVIOUS_WORDS = ['anterior', 'atras'];
const CLOSE_WORDS = ['cerrar', 'regresar', 'volver', 'salir'];

function includesAny(utterance: string, words: readonly string[]): boolean {
  return words.some((word) => utterance.includes(word));
}

export function parseVoiceCommand(rawUtterance: string): VoiceCommand {
  const utterance = normalise(rawUtterance);
  if (utterance === '') return { type: 'none' };

  if (includesAny(utterance, CATALOG_WORDS)) {
    return { type: 'open-catalog', company: matchCompany(utterance) };
  }
  if (includesAny(utterance, PORTFOLIO_WORDS)) {
    return { type: 'open-portfolio', company: matchCompany(utterance) };
  }
  if (includesAny(utterance, QR_WORDS)) return { type: 'open-qr' };
  if (includesAny(utterance, FORM_WORDS)) return { type: 'open-form' };
  if (includesAny(utterance, NEXT_WORDS)) return { type: 'next' };
  if (includesAny(utterance, PREVIOUS_WORDS)) return { type: 'previous' };
  if (includesAny(utterance, CLOSE_WORDS)) return { type: 'close' };
  if (includesAny(utterance, WEBSITE_WORDS)) return { type: 'open-website' };

  const company = matchCompany(utterance);
  if (company !== null) return { type: 'select-company', company };

  return { type: 'none' };
}
