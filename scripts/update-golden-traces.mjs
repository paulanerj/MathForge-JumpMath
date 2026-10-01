/**
 * GOLDEN TRACES DELIBERATE UPDATE TOOL
 *
 * Explicit intent required via --confirm flag ONLY.
 * Environment variables (e.g. CONFIRM_UPDATE=1) are explicitly rejected.
 * Normal tests NEVER run this tool.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { ensureEsbuild, localPackage, root } from './project-toolchain.mjs';

const isConfirmed = process.argv.includes('--confirm');

if (!isConfirmed) {
  console.error('\n[SAFETY ERROR] Updating golden traces requires explicit CLI intent.');
  console.error('Run: npm run behavioral-freeze:update -- --confirm\n');
  process.exit(1);
}

const tsxEsbuild = localPackage('esbuild').pkg;
const esbuildBin = ensureEsbuild(tsxEsbuild.version);
const tsx = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const generatorScript = path.join(root, 'tests', 'characterization', 'generate_golden.ts');

console.log('\n[GOLDEN UPDATE] Generating authoritative golden traces for all scenarios...');

const child = spawnSync(process.execPath, [tsx, generatorScript], {
  cwd: root,
  env: { ...process.env, ESBUILD_BINARY_PATH: esbuildBin },
  stdio: 'inherit',
});

if (child.status !== 0) {
  console.error('\n[GOLDEN UPDATE FAILED]');
  process.exit(child.status ?? 1);
}

// Generate cryptographic SHA-256 manifest anchor
const manifestTool = path.join(root, 'scripts', 'update-manifest.mjs');
const manifestChild = spawnSync(process.execPath, [manifestTool], {
  cwd: root,
  stdio: 'inherit',
});

if (manifestChild.status !== 0) {
  console.error('\n[MANIFEST GENERATION FAILED]');
  process.exit(manifestChild.status ?? 1);
}

console.log('\n[GOLDEN UPDATE SUCCESSFUL] Authoritative traces and cryptographic manifest recorded.\n');
