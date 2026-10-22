/**
 * One-off: zips deploy/cpanel with explicit Unix permission bits on every entry.
 *
 * PowerShell's Compress-Archive does not write Unix file-mode bits into the zip's
 * external file attributes at all for nested directories — cPanel's unzip then has
 * nothing to fall back to and extracts some of them as unreadable (mode 0, blank in
 * File Manager, "31 dic 1969" for the timestamp because even that could not be read).
 * `archiver` lets every entry's mode be set explicitly instead of inferred.
 */
import { createWriteStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

// archiver is CommonJS without clean ESM default-export interop; createRequire sidesteps
// the "does not provide an export named 'default'" error a plain `import` hits here.
const require = createRequire(import.meta.url);
const archiver = require('archiver');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'deploy', 'cpanel');
const OUT = path.join(ROOT, 'deploy', 'cpanel-deploy.zip');

const DIR_MODE = 0o755;
const FILE_MODE = 0o644;

async function walk(dir, relBase, archive) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.posix.join(relBase, entry.name);
    if (entry.isDirectory()) {
      // Explicit directory entry, not just inferred from the files inside it --
      // otherwise an empty-looking (but present) folder can still end up with no
      // mode of its own in the zip.
      archive.append(null, { name: `${relPath}/`, mode: DIR_MODE });
      await walk(fullPath, relPath, archive);
    } else {
      archive.file(fullPath, { name: relPath, mode: FILE_MODE });
    }
  }
}

async function main() {
  const sourceStat = await stat(SOURCE).catch(() => null);
  if (sourceStat === null) {
    throw new Error(`${SOURCE} does not exist. Run "npm run deploy:cpanel" first.`);
  }

  const output = createWriteStream(OUT);
  // archiver@8 exports classes directly rather than the older factory-function shape.
  const archive = new archiver.ZipArchive({ zlib: { level: 9 } });

  const done = new Promise((resolve, reject) => {
    output.on('close', resolve);
    archive.on('error', reject);
  });

  archive.pipe(output);
  await walk(SOURCE, '', archive);
  await archive.finalize();
  await done;

  console.log(`Wrote ${OUT} (${(output.bytesWritten / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
