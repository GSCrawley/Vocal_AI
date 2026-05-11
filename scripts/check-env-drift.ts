#!/usr/bin/env node
/**
 * Fails CI if any service or app references process.env.X
 * where X is not declared in .env.example.
 *
 * Excludes: NODE_ENV, PATH, HOME, PWD, CI, and other intrinsic env vars.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const ENV_EXAMPLE = join(ROOT, '.env.example');
const SCAN_DIRS = ['apps', 'services', 'packages'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.expo', 'coverage']);
const INTRINSICS = new Set([
  'NODE_ENV', 'PATH', 'HOME', 'PWD', 'CI', 'PORT',
  'RENDER', 'RENDER_GIT_COMMIT', 'RENDER_GIT_BRANCH',
  'EXPO_PUBLIC_PLATFORM', 'TZ',
]);

const declared = new Set(
  readFileSync(ENV_EXAMPLE, 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('#'))
    .map((l) => l.split('=')[0]?.trim())
    .filter(Boolean) as string[],
);

const referenced = new Map<string, string[]>(); // varName -> files referencing it
const PROCESS_ENV_RE = /process\.env\.([A-Z][A-Z0-9_]*)/g;
const EXPO_PUBLIC_RE = /Constants\.expoConfig\?\.extra\?\.([A-Z][A-Z0-9_]*)/g;

function walk(dir: string) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) scan(full);
  }
}

function scan(file: string) {
  const src = readFileSync(file, 'utf8');
  for (const re of [PROCESS_ENV_RE, EXPO_PUBLIC_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1]!;
      if (INTRINSICS.has(name)) continue;
      if (!referenced.has(name)) referenced.set(name, []);
      referenced.get(name)!.push(relative(ROOT, file));
    }
  }
}

let hadScanError = false;
for (const d of SCAN_DIRS) {
  try {
    walk(join(ROOT, d));
  } catch (err) {
    console.error(`❌ Failed to scan directory "${d}": ${err instanceof Error ? err.message : String(err)}`);
    hadScanError = true;
  }
}
if (hadScanError) {
  console.error('\nAborting: scan errors above may produce false-clean results.');
  process.exit(1);
}

const missing: { name: string; files: string[] }[] = [];
for (const [name, files] of referenced) {
  if (!declared.has(name)) missing.push({ name, files: [...new Set(files)] });
}

if (missing.length > 0) {
  console.error('❌ .env.example drift detected. The following env vars are read in code but not declared in .env.example:\n');
  for (const m of missing) {
    console.error(`  ${m.name}`);
    for (const f of m.files.slice(0, 3)) console.error(`    ↳ ${f}`);
    if (m.files.length > 3) console.error(`    ↳ ...and ${m.files.length - 3} more`);
  }
  console.error('\nFix: add an entry for each missing var to .env.example (with an empty value if secret).');
  process.exit(1);
}

console.log(`✓ .env.example is in sync (${declared.size} declared, ${referenced.size} referenced).`);
