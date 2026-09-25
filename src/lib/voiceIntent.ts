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
  | { readonly type: 'quick-register' }
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

/** Full name and slug — checked as exact substrings first, since correctly-pronounced
 *  speech matches these cheaply and predictably without needing fuzzy comparison. */
const PHRASE_CANDIDATES: readonly CompanyCandidate[] = COMPANIES.map((company) => ({
  company,
  token: normalise(company.name),
}));

/** Individual distinguishing words ("zentek", "trust", "rekuperat"…) — these are what
 *  get fuzzy-matched, since a single brand word is exactly what SpeechRecognition tends
 *  to mishear ("Zentek" as "Centec", say) on names that are not real Spanish words. */
const WORD_CANDIDATES: readonly CompanyCandidate[] = COMPANIES.flatMap((company) => {
  const words = normalise(company.name)
    .split(' ')
    .filter((word) => word.length >= MIN_TOKEN_LENGTH);
  const tokens = new Set([company.slug, ...words]);
  return [...tokens].map((token) => ({ company, token }));
});

/**
 * Standard edit distance — small strings only (brand-name-length), so the plain O(n·m)
 * table is more than fast enough for nineteen companies checked per utterance. The
 * non-null assertions below are all on indices the loop bounds guarantee are populated
 * (every cell is written before any later cell reads it), not genuine uncertainty.
 */
function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, (_, i) => {
    const row = new Array<number>(cols).fill(0);
    row[0] = i;
    return row;
  });
  for (let j = 1; j < cols; j += 1) table[0]![j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      table[i]![j] = Math.min(table[i - 1]![j]! + 1, table[i]![j - 1]! + 1, table[i - 1]![j - 1]! + cost);
    }
  }
  return table[rows - 1]![cols - 1]!;
}

/** How many edits a mis-transcribed word may still be considered "the same" brand word —
 *  scales with length so a short word still needs to be close, a longer one has more
 *  room (a single dropped or swapped syllable should not cost the whole match). */
function fuzzyTolerance(tokenLength: number): number {
  return Math.max(1, Math.floor(tokenLength / 4));
}

/**
 * Finds the company whose name best overlaps the utterance.
 *
 * Two passes: an exact substring check against the full name/slug first (cheap, exact,
 * covers correctly-pronounced speech), then — only if that finds nothing — a fuzzy
 * word-by-word pass tolerant of the kind of mis-transcription SpeechRecognition produces
 * on brand names that are not real Spanish words. Either way, "best" is the longest or
 * closest matching token; a tie between two different companies (both Yanayacu
 * businesses matched on "yanayacu" alone, say) resolves to no match rather than
 * guessing wrong.
 */
function matchCompany(utterance: string): Company | null {
  let best: { readonly company: Company; readonly length: number } | null = null;
  let tied = false;

  for (const { company, token } of PHRASE_CANDIDATES) {
    if (!utterance.includes(token)) continue;
    if (best === null || token.length > best.length) {
      best = { company, length: token.length };
      tied = false;
    } else if (token.length === best.length && company.slug !== best.company.slug) {
      tied = true;
    }
  }
  if (best !== null) return tied ? null : best.company;

  const words = utterance.split(' ');
  type FuzzyMatch = { readonly company: Company; readonly length: number; readonly distance: number };
  const matches: FuzzyMatch[] = [];

  for (const { company, token } of WORD_CANDIDATES) {
    const tolerance = fuzzyTolerance(token.length);
    for (const word of words) {
      if (Math.abs(word.length - token.length) > tolerance) continue;
      const distance = levenshtein(word, token);
      if (distance <= tolerance) matches.push({ company, length: token.length, distance });
    }
  }
  if (matches.length === 0) return null;

  // Lowest distance wins; a tie breaks toward the longer (more specific) token.
  matches.sort((a, b) => a.distance - b.distance || b.length - a.length);
  const winner = matches[0]!;
  const isTied = matches.some(
    (match) =>
      match.distance === winner.distance && match.length === winner.length && match.company.slug !== winner.company.slug,
  );

  return isTied ? null : winner.company;
}

const CATALOG_WORDS = ['catalogo'];
const PORTFOLIO_WORDS = ['portafolio', 'portfolio'];
const QR_WORDS = ['qr', 'codigo qr'];
const FORM_WORDS = ['formulario'];
/** Checked before FORM_WORDS: "registrar cliente" must win over a bare "registrar". */
/** Each entry: every word in it must appear somewhere in the utterance, in any order and
 *  with anything in between — "quiero registrar a un cliente nuevo" should match just as
 *  well as the literal phrase "registrar cliente". */
const QUICK_REGISTER_PHRASES: readonly (readonly string[])[] = [
  ['registrar', 'cliente'],
  ['registrar', 'contacto'],
];
const WEBSITE_WORDS = ['sitio web', 'pagina web', 'abrir la web', 'ingresar a la web'];
const NEXT_WORDS = ['siguiente', 'proxima empresa', 'proximo'];
const PREVIOUS_WORDS = ['anterior', 'atras'];
const CLOSE_WORDS = ['cerrar', 'regresar', 'volver', 'salir'];

function includesAny(utterance: string, words: readonly string[]): boolean {
  return words.some((word) => utterance.includes(word));
}

function includesAllWords(utterance: string, words: readonly string[]): boolean {
  const tokens = new Set(utterance.split(' '));
  return words.every((word) => tokens.has(word));
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
  if (QUICK_REGISTER_PHRASES.some((words) => includesAllWords(utterance, words))) {
    return { type: 'quick-register' };
  }
  if (includesAny(utterance, FORM_WORDS)) return { type: 'open-form' };
  if (includesAny(utterance, NEXT_WORDS)) return { type: 'next' };
  if (includesAny(utterance, PREVIOUS_WORDS)) return { type: 'previous' };
  if (includesAny(utterance, CLOSE_WORDS)) return { type: 'close' };
  if (includesAny(utterance, WEBSITE_WORDS)) return { type: 'open-website' };

  const company = matchCompany(utterance);
  if (company !== null) return { type: 'select-company', company };

  return { type: 'none' };
}
