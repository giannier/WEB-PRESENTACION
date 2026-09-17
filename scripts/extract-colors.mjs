/**
 * Derives one brand colour per company from its own logo.
 *
 * Averaging the pixels would produce mud, so instead every opaque pixel is binned by
 * hue and the winning bin is the one with the most *chromatic weight* — pixel count
 * multiplied by saturation. That is what makes a small saturated mark beat a large
 * near-grey background, which is exactly how a human reads "the colour of that logo".
 *
 * Output: src/data/companyColors.ts (generated — do not edit by hand).
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOGO_DIR = path.join(ROOT, 'public', 'logos');
const OUT_FILE = path.join(ROOT, 'src', 'data', 'companyColors.ts');

/** Sample grid. 64x64 is ample: we want proportions, not detail. */
const SAMPLE = 64;
/** Alpha below this is treated as background. */
const MIN_ALPHA = 200;
/** Pixels flatter than this are greys and carry no hue information. */
const MIN_SATURATION = 0.18;
/** Near-black and near-white are excluded from the hue vote. */
const MIN_LIGHTNESS = 0.12;
const MAX_LIGHTNESS = 0.94;
/** Hue bin width in degrees. */
const HUE_BINS = 36;

const SLUGS = [
  'somosescuelacapacita', 'arbicop', 'convive360', 'aguayanayacu', 'yanayacuclean',
  'zentek360', 'surelife360', 'agrosumak', 'ssomasafe', 'trustagroexport',
  'abubu', 'supplylogistic360', 'corporacionyanayacu', 'tuperfil360', 'somostributa',
  'parkeatcar', 'rekuperat', 'ynsumedic', 'quantukperu',
];

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l };

  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;

  return { h: h * 360, s, l };
}

function hslToHex(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let rgb;
  if (h < 60) rgb = [c, x, 0];
  else if (h < 120) rgb = [x, c, 0];
  else if (h < 180) rgb = [0, c, x];
  else if (h < 240) rgb = [0, x, c];
  else if (h < 300) rgb = [x, 0, c];
  else rgb = [c, 0, x];

  return `#${rgb
    .map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

async function extract(slug) {
  const file = path.join(LOGO_DIR, `${slug}.png`);
  const { data, info } = await sharp(file)
    .resize(SAMPLE, SAMPLE, { fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bins = new Map();
  let opaque = 0;

  for (let i = 0; i < data.length; i += info.channels) {
    const alpha = data[i + 3];
    if (alpha < MIN_ALPHA) continue;
    opaque += 1;

    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < MIN_SATURATION || l < MIN_LIGHTNESS || l > MAX_LIGHTNESS) continue;

    const bin = Math.floor(h / (360 / HUE_BINS));
    const current = bins.get(bin) ?? { weight: 0, h: 0, s: 0, l: 0, n: 0 };
    // Weight by saturation so a vivid mark outvotes a broad washed-out area.
    current.weight += s;
    current.h += h;
    current.s += s;
    current.l += l;
    current.n += 1;
    bins.set(bin, current);
  }

  if (bins.size === 0) {
    // Fully achromatic logo (pure black/white mark). Fall back to a neutral slate.
    return { hex: '#64748b', note: 'achromatic' };
  }

  const [, best] = [...bins.entries()].sort((a, b) => b[1].weight - a[1].weight)[0];
  const h = best.h / best.n;
  // Normalise saturation and lightness into a band that stays legible as a filled
  // sector behind a logo, in both light and dark surroundings.
  const s = Math.min(0.82, Math.max(0.45, best.s / best.n));
  const l = Math.min(0.56, Math.max(0.36, best.l / best.n));

  return {
    hex: hslToHex(h, s, l),
    note: `${Math.round((opaque / (SAMPLE * SAMPLE)) * 100)}% opaque`,
  };
}

const results = [];
for (const slug of SLUGS) {
  const { hex, note } = await extract(slug);
  results.push({ slug, hex });
  console.log(`  ${slug.padEnd(24)} ${hex}  (${note})`);
}

const body = `/**
 * GENERATED FILE — do not edit by hand.
 * Run \`npm run colors:extract\` to regenerate from the logos in public/logos.
 *
 * One brand colour per company, derived from the dominant chromatic hue of its own
 * logo and normalised into a saturation/lightness band that stays legible as a filled
 * sector behind white text.
 */
export const COMPANY_COLORS: Readonly<Record<string, string>> = {
${results.map(({ slug, hex }) => `  '${slug}': '${hex}',`).join('\n')}
};

/** Fallback for a slug with no generated colour. */
export const DEFAULT_COMPANY_COLOR = '#64748b';

export function companyColor(slug: string): string {
  return COMPANY_COLORS[slug] ?? DEFAULT_COMPANY_COLOR;
}
`;

await writeFile(OUT_FILE, body, 'utf8');
console.log(`\n  wrote ${path.relative(ROOT, OUT_FILE)} (${results.length} colours)`);
