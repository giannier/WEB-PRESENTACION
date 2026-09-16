#!/usr/bin/env node
/**
 * Downscales every logo in `public/logos` so nineteen textures can live on a phone GPU
 * at the same time.
 *
 * Idempotent: a file whose longest side is already within MAX_EDGE is reported as
 * skipped and left byte-for-byte untouched, so the script is safe to re-run in CI or
 * after dropping in a new logo.
 *
 * Usage: npm run logos:optimize
 */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const MAX_EDGE = 512;
const PNG_OPTIONS = { quality: 80, compressionLevel: 9 };

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logosDirectory = path.join(projectRoot, 'public', 'logos');

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
  let resized = 0;
  let skipped = 0;

  for (const name of files) {
    const filePath = path.join(logosDirectory, name);
    const { size: sizeBefore } = await stat(filePath);
    totalBefore += sizeBefore;

    // Read the whole file up front: the output is written back to the same path,
    // so sharp must not still hold a read handle on it.
    const input = await readFile(filePath);
    const metadata = await sharp(input).metadata();
    const longestEdge = Math.max(metadata.width ?? 0, metadata.height ?? 0);

    if (longestEdge > 0 && longestEdge <= MAX_EDGE) {
      totalAfter += sizeBefore;
      skipped += 1;
      console.log(
        `  skip    ${name.padEnd(26)} ${String(metadata.width)}x${String(metadata.height)}  ${formatBytes(sizeBefore)}`,
      );
      continue;
    }

    const output = await sharp(input)
      .resize({
        width: MAX_EDGE,
        height: MAX_EDGE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .png(PNG_OPTIONS)
      .toBuffer();

    await writeFile(filePath, output);

    totalAfter += output.length;
    resized += 1;

    const saved = sizeBefore === 0 ? 0 : (1 - output.length / sizeBefore) * 100;
    console.log(
      `  resize  ${name.padEnd(26)} ${String(metadata.width)}x${String(metadata.height)} -> max ${MAX_EDGE}  ` +
        `${formatBytes(sizeBefore)} -> ${formatBytes(output.length)}  (-${saved.toFixed(1)}%)`,
    );
  }

  const savedTotal = totalBefore === 0 ? 0 : (1 - totalAfter / totalBefore) * 100;

  console.log('');
  console.log(`  files    ${files.length} (${resized} resized, ${skipped} already optimized)`);
  console.log(`  before   ${formatBytes(totalBefore)}`);
  console.log(`  after    ${formatBytes(totalAfter)}`);
  console.log(`  saved    ${savedTotal.toFixed(1)}%`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
