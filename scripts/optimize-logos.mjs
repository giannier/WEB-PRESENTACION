#!/usr/bin/env node
/**
 * Normalises every logo in `public/logos` so the wheel treats them all consistently.
 *
 * Two passes, always applied:
 *   1. Trim the transparent padding down to the real artwork, then restore a small,
 *      uniform margin. The supplied PNGs are exported on a fixed square canvas with
 *      wildly different amounts of empty space baked in — one logo's ink can fill 95%
 *      of its canvas while another fills 25%, which is why some marks read tiny next to
 *      others of the same on-screen box. Trimming makes every logo equally full inside
 *      the frame the wheel gives it, and lets each keep its own natural aspect ratio
 *      instead of being forced into a square.
 *   2. Downscale so nineteen textures can live on a phone GPU at once.
 *
 * Idempotent: trimming an already-trimmed-and-padded logo removes the same margin and
 * re-adds it, so re-running changes nothing. Safe in CI or after dropping in a new logo.
 *
 * Usage: npm run logos:optimize
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

/**
 * Logos are the hero of the wheel and fill up to half the viewport height, so 512px
 * upscaled visibly on 1080p screens and 3x phone displays. 1024 stays sharp.
 */
const MAX_EDGE = 1024;
/** Breathing room restored after trimming, relative to the trimmed artwork's longer side. */
const TRIM_PADDING_RATIO = 0.06;
const PNG_OPTIONS = { compressionLevel: 9 };

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logosDirectory = path.join(projectRoot, 'public', 'logos');
const aspectRatiosFile = path.join(projectRoot, 'src', 'data', 'logoAspectRatios.ts');

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  let entries;
  try {
    entries = await readdir(logosDirectory);
  } catch {
    console.error(`No logo directory found at ${logosDirectory}`);
    process.exitCode = 1;
    return;
  }

  const files = entries.filter((name) => name.toLowerCase().endsWith('.png')).sort();

  if (files.length === 0) {
    console.error(`No PNG files found in ${logosDirectory}`);
    process.exitCode = 1;
    return;
  }

  let totalBefore = 0;
  let totalAfter = 0;
  const aspectRatios = [];

  for (const name of files) {
    const filePath = path.join(logosDirectory, name);
    const { size: sizeBefore } = await stat(filePath);
    totalBefore += sizeBefore;

    // Read the whole file up front: the output is written back to the same path, so
    // sharp must not still hold a read handle on it.
    const input = await readFile(filePath);
    const before = await sharp(input).metadata();

    // Pass 1: trim to the real ink, then restore a small uniform margin.
    const trimmed = await sharp(input).trim().toBuffer();
    const trimmedMeta = await sharp(trimmed).metadata();
    const pad = Math.round(Math.max(trimmedMeta.width, trimmedMeta.height) * TRIM_PADDING_RATIO);

    const padded = await sharp(trimmed)
      .extend({
        top: pad,
        bottom: pad,
        left: pad,
        right: pad,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .toBuffer();

    // Pass 2: cap the longest side. `fit: 'inside'` never upscales, so a logo whose
    // trimmed artwork is already small keeps its native resolution.
    const output = await sharp(padded)
      .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
      .png(PNG_OPTIONS)
      .toBuffer();

    await writeFile(filePath, output);

    const after = await sharp(output).metadata();
    totalAfter += output.length;

    const slug = name.replace(/\.png$/i, '');
    aspectRatios.push([slug, after.width / after.height]);

    const fillW = ((trimmedMeta.width / before.width) * 100).toFixed(0);
    const fillH = ((trimmedMeta.height / before.height) * 100).toFixed(0);
    const saved = sizeBefore === 0 ? 0 : (1 - output.length / sizeBefore) * 100;

    console.log(
      `  ${name.padEnd(26)} ${before.width}x${before.height} (ink ${fillW}%x${fillH}%) -> ` +
        `${after.width}x${after.height}  ${formatBytes(sizeBefore)} -> ${formatBytes(output.length)}  ` +
        `(${saved >= 0 ? '-' : '+'}${Math.abs(saved).toFixed(1)}%)`,
    );
  }

  const savedTotal = totalBefore === 0 ? 0 : (1 - totalAfter / totalBefore) * 100;

  console.log('');
  console.log(`  files    ${files.length}`);
  console.log(`  before   ${formatBytes(totalBefore)}`);
  console.log(`  after    ${formatBytes(totalAfter)}`);
  console.log(`  saved    ${savedTotal.toFixed(1)}%`);

  await writeAspectRatios(aspectRatios);
  console.log(`  wrote    ${path.relative(projectRoot, aspectRatiosFile)}`);
}

/**
 * Persists each logo's real width/height ratio after trimming.
 *
 * Trimming gives every logo its true, un-padded shape — a wide wordmark and a tall
 * emblem no longer share one "square" aspect. Anywhere a logo is dropped into a fixed
 * box at runtime (the QR code's centre mark, today) needs this ratio to size that box
 * without stretching the image, which the browser cannot measure from a raw file path
 * alone.
 */
async function writeAspectRatios(entries) {
  entries.sort(([a], [b]) => a.localeCompare(b));

  const body = `/**
 * GENERATED FILE — do not edit by hand.
 * Run \`npm run logos:optimize\` to regenerate from the trimmed logos in public/logos.
 *
 * Width ÷ height of each logo's real artwork, after the optimizer trims away the
 * transparent padding the source PNGs ship with. A value above 1 is wider than tall.
 * Use this wherever a logo is placed into a fixed box, so it can be sized to fit
 * without stretching — the browser has no way to measure an image's shape from its
 * file path alone.
 */
export const LOGO_ASPECT_RATIOS: Readonly<Record<string, number>> = {
${entries.map(([slug, ratio]) => `  ${slug}: ${ratio.toFixed(4)},`).join('\n')}
};

/** Falls back to square when a company has no entry yet. */
export function logoAspectRatio(slug: string): number {
  return LOGO_ASPECT_RATIOS[slug] ?? 1;
}
`;

  await writeFile(aspectRatiosFile, body, 'utf8');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
