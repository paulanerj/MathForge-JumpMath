/**
 * Resolve toolchain binaries from this project's node_modules only.
 */
import { chmodSync, copyFileSync, mkdtempSync, readdirSync, readFileSync, statSync } from 'fs';
import { spawnSync } from 'child_process';
import { tmpdir } from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'package.json'));
const localModules = path.join(root, 'node_modules');

export function localPackage(name) {
  const pkgPath = require.resolve(`${name}/package.json`, { paths: [root] });
  const pkgRoot = path.dirname(pkgPath);
  if (!pkgRoot.startsWith(localModules + path.sep) && pkgRoot !== localModules) {
    throw new Error(`${name} resolved outside this project: ${pkgRoot}`);
  }
  return { pkgPath, root: pkgRoot, pkg: JSON.parse(readFileSync(pkgPath, 'utf8')) };
}

function canRun(bin) {
  const probe = spawnSync(bin, ['--version'], { encoding: 'utf8' });
  return probe.status === 0 && /^\d+\.\d+\.\d+/.test((probe.stdout || '').trim());
}

function candidateBins() {
  const found = [];
  const stack = [localModules];
  while (stack.length) {
    const dir = stack.pop();
    let entries = [];
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const insideEsbuildPkg = dir.includes(`${path.sep}@esbuild${path.sep}`) || dir.endsWith(`${path.sep}@esbuild`);
        if (!insideEsbuildPkg && entry.name.startsWith('@') && entry.name !== '@esbuild') continue;
        if (insideEsbuildPkg || entry.name === 'bin' || entry.name === '@esbuild' || entry.name === 'node_modules' || entry.name.includes('esbuild') || entry.name === 'tsx' || entry.name.startsWith('.tsx')) {
          stack.push(full);
        }
      } else if (entry.name === 'esbuild' || entry.name === 'esbuild.exe') {
        found.push(full);
      }
    }
  }
  return found;
}

function runnableCopy(bin) {
  if (canRun(bin)) return bin;
  const dir = mkdtempSync(path.join(tmpdir(), 'jumpmath-esbuild-'));
  const copy = path.join(dir, path.basename(bin));
  copyFileSync(bin, copy);
  try { chmodSync(copy, 0o755); } catch { /* temp filesystems are usually executable */ }
  return canRun(copy) ? copy : null;
}

export function ensureEsbuild(expectedVersion) {
  const directCandidates = [
    path.join(localModules, '@esbuild', 'linux-x64', 'bin', 'esbuild'),
    path.join(localModules, 'esbuild', 'bin', 'esbuild'),
  ];
  for (const bin of directCandidates) {
    const runnable = runnableCopy(bin);
    if (!runnable) continue;
    const probe = spawnSync(runnable, ['--version'], { encoding: 'utf8' });
    const version = (probe.stdout || '').trim();
    if (!expectedVersion || version === expectedVersion) return runnable;
  }
  const matches = [];
  for (const bin of candidateBins()) {
    const runnable = runnableCopy(bin);
    if (!runnable) continue;
    const version = spawnSync(runnable, ['--version'], { encoding: 'utf8' }).stdout.trim();
    if (!expectedVersion || version === expectedVersion) matches.push({ version, bin: runnable, source: bin });
  }
  if (!matches.length) {
    throw new Error(
      `No runnable project-local esbuild${expectedVersion ? ` ${expectedVersion}` : ''} was found under ${localModules}. ` +
      'Refusing to use a toolchain from outside this project.'
    );
  }
  return matches[0].bin;
}
