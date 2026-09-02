import { cp, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

await mkdir(path.join(standalone, '.next'), { recursive: true });

const staticSrc = path.join(root, '.next', 'static');
const staticDest = path.join(standalone, '.next', 'static');
if (await exists(staticSrc)) {
  await cp(staticSrc, staticDest, { recursive: true, force: true });
  console.log('✓ Copied .next/static into standalone bundle');
}

const publicSrc = path.join(root, 'public');
const publicDest = path.join(standalone, 'public');
if (await exists(publicSrc)) {
  await cp(publicSrc, publicDest, { recursive: true, force: true });
  console.log('✓ Copied public into standalone bundle');
}
