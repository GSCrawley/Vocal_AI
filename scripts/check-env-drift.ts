#!/usr/bin/env node
/**
 * Fails CI if any service or app references process.env.X
 * where X is not declared in .env.example.
 *
 * Excludes: NODE_ENV, PATH, HOME, PWD, CI, and other intrinsic env vars.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join, relative } from 'node:path';

export const ROOT = process.cwd();
export const ENV_EXAMPLE = join(ROOT, '.env.example');
export const SCAN_DIRS = ['apps', 'services', 'packages'];
export const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.expo', 'coverage']);
export const INTRINSICS = new Set([
  'NODE_ENV',
  'PATH',
  'HOME',
  'PWD',
  'CI',
  'PORT',
  'RENDER',
  'RENDER_GIT_COMMIT',
  'RENDER_GIT_BRANCH',
  'EXPO_PUBLIC_PLATFORM',
  'TZ',
]);

const PROCESS_ENV_RE = /process\.env\.([A-Z][A-Z0-9_]*)/g;
const EXPO_PUBLIC_RE = /Constants\.expoConfig\?\.extra\?\.([A-Z][A-Z0-9_]*)/g;

export function getDeclaredEnvVars(envExamplePath: string): Set<string> {
  try {
    return new Set(
      readFileSync(envExamplePath, 'utf8')
        .split('\n')
        .filter((l) => l.trim() && !l.trim().startsWith('#'))
        .map((l) => l.split('=')[0]?.trim())
        .filter(Boolean) as string[]
    );
  } catch (error) {
    throw new Error(
      `Failed to read or parse ${envExamplePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

export function walk(dir: string, referenced: Map<string, string[]>, rootDir: string) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry) || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, referenced, rootDir);
    else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry)) scan(full, referenced, rootDir);
  }
}

export function scan(file: string, referenced: Map<string, string[]>, rootDir: string) {
  const src = readFileSync(file, 'utf8');
  for (const re of [PROCESS_ENV_RE, EXPO_PUBLIC_RE]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) {
      const name = m[1]!;
      if (INTRINSICS.has(name)) continue;
      if (!referenced.has(name)) referenced.set(name, []);
      referenced.get(name)!.push(relative(rootDir, file));
    }
  }
}

export function runCheck(
  rootDir: string,
  scanDirs: string[],
  envExamplePath: string
): { success: boolean; missing?: { name: string; files: string[] }[]; error?: string } {
  const declared = getDeclaredEnvVars(envExamplePath);
  const referenced = new Map<string, string[]>(); // varName -> files referencing it
  let hadScanError = false;

  for (const d of scanDirs) {
    try {
      walk(join(rootDir, d), referenced, rootDir);
    } catch (err) {
      console.error(
        `❌ Failed to scan directory "${d}": ${err instanceof Error ? err.message : String(err)}`
      );
      hadScanError = true;
    }
  }

  if (hadScanError) {
    return { success: false, error: 'scan errors above may produce false-clean results' };
  }

  const missing: { name: string; files: string[] }[] = [];
  for (const [name, files] of referenced) {
    if (!declared.has(name)) missing.push({ name, files: [...new Set(files)] });
  }

  if (missing.length > 0) {
    return { success: false, missing };
  }

  return { success: true };
}

// Only execute the script logic if run directly
const invokedPath = process.argv[1] ?? '';
const invokedName = basename(invokedPath);
if (invokedName === 'check-env-drift.ts' || invokedName === 'check-env-drift.js') {
  const result = runCheck(ROOT, SCAN_DIRS, ENV_EXAMPLE);

  if (result.error) {
    console.error(`\nAborting: ${result.error}.`);
    process.exit(1);
  }

  if (result.missing && result.missing.length > 0) {
    console.error(
      '❌ .env.example drift detected. The following env vars are read in code but not declared in .env.example:\n'
    );
    for (const m of result.missing) {
      console.error(`  ${m.name}`);
      for (const f of m.files.slice(0, 3)) console.error(`    ↳ ${f}`);
      if (m.files.length > 3) console.error(`    ↳ ...and ${m.files.length - 3} more`);
    }
    console.error(
      '\nFix: add an entry for each missing var to .env.example (with an empty value if secret).'
    );
    process.exit(1);
  }

  const declared = getDeclaredEnvVars(ENV_EXAMPLE);
  console.log(`✓ .env.example is in sync (${declared.size} declared).`);
}
