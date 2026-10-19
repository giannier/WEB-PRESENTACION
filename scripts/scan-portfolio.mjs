/**
 * Builds the portfolio manifest from whatever is sitting in `public/portafolio`.
 *
 * Each company gets its own subfolder, `public/portafolio/<slug>/`, holding whatever
 * flyers, catalogues, videos or product sheets that business wants to show — images,
 * PDFs or videos, any file name, any count. Runs automatically before `dev` and `build`,
 * so dropping files into a company's folder is the whole workflow: no manifest to
 * hand-edit, no code change, no command to remember. A company with no folder (or an
 * empty one) simply gets no portfolio button — nothing renders broken.
 *
 * The extension decides the kind, and the three kinds are kept apart on purpose: a
 * flyer, a vertical video and a product catalogue are browsed in completely different
 * ways, so the `type` here is what lets the UI offer them as separate shelves instead
 * of one mixed pile.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORTFOLIO_DIR = path.join(ROOT, 'public', 'portafolio');
const COMPANIES_FILE = path.join(ROOT, 'src', 'data', 'companies.ts');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'companyPortfolio.ts');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const PDF_EXTENSION = '.pdf';
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

async function readSlugs() {
  const source = await readFile(COMPANIES_FILE, 'utf8');
  return [...source.matchAll(/\{ slug: '([a-z0-9]+)'/g)].map((match) => match[1]);
}

async function readEntries(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

/** "2.webp" before "10.webp" — a plain string sort would put "10" first. */
function naturalCompare(a, b) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function escapeSingleQuotes(text) {
  return text.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const slugs = await readSlugs();
const companyDirs = await readEntries(PORTFOLIO_DIR);

const portfolio = new Map();
const unknown = [];

for (const entry of companyDirs) {
  if (!entry.isDirectory()) continue;
  const slug = entry.name;

  if (!slugs.includes(slug)) {
    unknown.push(slug);
    continue;
  }

  const files = await readEntries(path.join(PORTFOLIO_DIR, slug));
  const items = files
    .filter((file) => file.isFile())
    .map((file) => file.name)
    .sort(naturalCompare)
    .flatMap((file) => {
      const extension = path.extname(file).toLowerCase();
      const isImage = IMAGE_EXTENSIONS.has(extension);
      const isPdf = extension === PDF_EXTENSION;
      const isVideo = VIDEO_EXTENSIONS.has(extension);
      if (!isImage && !isPdf && !isVideo) return [];

      return [
        {
          type: isVideo ? 'video' : isPdf ? 'pdf' : 'image',
          // File names can contain spaces or accents ("CATÁLOGO SSOMA.pdf"); encoding
          // only the segment (not the slashes) keeps the URL valid everywhere.
          src: `/portafolio/${slug}/${encodeURIComponent(file)}`,
          name: path.basename(file, extension),
        },
      ];
    });

  if (items.length > 0) portfolio.set(slug, items);
}

const entries = [...portfolio.entries()].sort(([a], [b]) => a.localeCompare(b));

const body = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`npm run portfolio:scan\`, which runs automatically before \`dev\` and
 * \`build\`. To give a company a portfolio, drop images, videos or PDFs into
 * \`public/portafolio/<slug>/\` — any file name, any count.
 */

export type PortfolioItem = {
  readonly type: 'image' | 'pdf' | 'video';
  readonly src: string;
  readonly name: string;
};

export const COMPANY_PORTFOLIO: Readonly<Record<string, readonly PortfolioItem[]>> = {
${entries
  .map(
    ([slug, items]) =>
      `  ${slug}: [\n${items
        .map(
          (item) =>
            `    { type: '${item.type}', src: '${item.src}', name: '${escapeSingleQuotes(item.name)}' },`,
        )
        .join('\n')}\n  ],`,
  )
  .join('\n')}
};

export function portfolioFor(slug: string): readonly PortfolioItem[] {
  return COMPANY_PORTFOLIO[slug] ?? [];
}
`;

await writeFile(OUT_FILE, body, 'utf8');

console.log(`  portfolio   ${entries.length} of ${slugs.length} companies`);
for (const [slug, items] of entries) console.log(`    ${slug.padEnd(22)} ${items.length} file(s)`);
for (const slug of unknown) console.log(`    SKIPPED  ${slug} — no company with that slug`);
if (entries.length === 0) console.log('    (drop images, videos or PDFs into public/portafolio/<slug>/)');
