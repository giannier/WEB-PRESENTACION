/**
 * Builds the cover manifest from whatever is sitting in `public/portadas`.
 *
 * The browser cannot ask the filesystem what exists, so the mapping is resolved here
 * and written to `src/data/companyCovers.ts`. Runs automatically before `dev` and
 * `build`, which means dropping a file into the folder is the whole workflow: no
 * renaming to a fixed extension, no code change, no command to remember.
 *
 * The file name (without extension) must match the company slug in `companies.ts`.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const COVERS_DIR = path.join(ROOT, 'public', 'portadas');
const COMPANIES_FILE = path.join(ROOT, 'src', 'data', 'companies.ts');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'companyCovers.ts');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.webm', '.mov']);

async function readSlugs() {
  const source = await readFile(COMPANIES_FILE, 'utf8');
  return [...source.matchAll(/\{ slug: '([a-z0-9]+)'/g)].map((match) => match[1]);
}

async function readCovers() {
  try {
    return await readdir(COVERS_DIR);
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const slugs = await readSlugs();
const files = await readCovers();

const covers = new Map();
const unknown = [];

for (const file of files.sort()) {
  const extension = path.extname(file).toLowerCase();
  const isVideo = VIDEO_EXTENSIONS.has(extension);
  if (!isVideo && !IMAGE_EXTENSIONS.has(extension)) continue;

  const slug = path.basename(file, path.extname(file)).toLowerCase();
  if (!slugs.includes(slug)) {
    unknown.push(file);
    continue;
  }

  // A video wins over a still of the same company: it is the richer asset, and a
  // matching image name can then serve as its poster frame.
  const poster = isVideo
    ? files.find((candidate) => {
        const candidateExtension = path.extname(candidate).toLowerCase();
        return (
          IMAGE_EXTENSIONS.has(candidateExtension) &&
          path.basename(candidate, candidateExtension).toLowerCase() === slug
        );
      })
    : undefined;

  const existing = covers.get(slug);
  if (existing !== undefined && existing.type === 'video' && !isVideo) continue;

  covers.set(slug, {
    type: isVideo ? 'video' : 'image',
    src: `/portadas/${file}`,
    ...(poster === undefined ? {} : { poster: `/portadas/${poster}` }),
  });
}

const entries = [...covers.entries()].sort(([a], [b]) => a.localeCompare(b));

const body = `/**
 * GENERATED FILE — do not edit by hand.
 *
 * Written by \`npm run covers:scan\`, which runs automatically before \`dev\` and
 * \`build\`. To give a company its artwork, drop a file into \`public/portadas\` named
 * after its slug: \`trustagroexport.webp\`, \`zentek360.mp4\`, and so on.
 */
import type { ShowcaseMedia } from '@/data/companyProfiles';

export const COMPANY_COVERS: Readonly<Record<string, ShowcaseMedia>> = {
${entries
  .map(
    ([slug, cover]) =>
      `  ${slug}: { type: '${cover.type}', src: '${cover.src}'${
        cover.poster === undefined ? '' : `, poster: '${cover.poster}'`
      } },`,
  )
  .join('\n')}
};

export function coverFor(slug: string): ShowcaseMedia | undefined {
  return COMPANY_COVERS[slug];
}
`;

await writeFile(OUT_FILE, body, 'utf8');

console.log(`  covers   ${entries.length} of ${slugs.length} companies`);
for (const [slug, cover] of entries) console.log(`    ${slug.padEnd(22)} ${cover.type}  ${cover.src}`);
for (const file of unknown) console.log(`    SKIPPED  ${file} — no company with that slug`);
if (entries.length === 0) console.log('    (drop artwork into public/portadas named after each company slug)');
