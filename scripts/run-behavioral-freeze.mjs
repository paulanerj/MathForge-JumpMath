/**
 * RUNNER: BEHAVIORAL FREEZE ORACLE
 *
 * Runs characterization scenarios against approved golden traces.
 * Exits non-zero on any behavioral divergence.
 */

import { spawnSync } from 'child_process';
import path from 'path';
import { ensureEsbuild, localPackage, root } from './project-toolchain.mjs';
import { verifyManifest } from './update-manifest.mjs';

let tsxEsbuild;
try {
  tsxEsbuild = localPackage('esbuild').pkg;
} catch {
  // fallback
}
const esbuildBin = ensureEsbuild(tsxEsbuild?.version);
const tsx = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const suite = path.join(root, 'tests', 'characterization', 'characterization_suite.ts');

console.log('\n================================================================');
console.log('   JUMPMATH R2 BEHAVIORAL FREEZE CHARACTERIZATION ORACLE        ');
console.log('================================================================\n');

// 1. Verify Cryptographic Manifest Anchor
console.log('--- Step 1: Cryptographic Manifest Verification (GOLDEN_MANIFEST.sha256) ---');
const manifestCheck = verifyManifest(root);
if (!manifestCheck.manifestFound) {
  console.error('[MANIFEST ERROR] GOLDEN_MANIFEST.sha256 not found. Behavioral baseline unanchored.');
  process.exit(1);
}
if (!manifestCheck.valid) {
  console.error('[MANIFEST ERROR] Cryptographic manifest verification failed!');
  if (manifestCheck.missingFiles.length > 0) {
    console.error('  Missing tracked files:', manifestCheck.missingFiles);
  }
  if (manifestCheck.mismatchedFiles.length > 0) {
    console.error('  Mismatched/tampered files:', manifestCheck.mismatchedFiles);
  }
  process.exit(1);
}
console.log(`[PASS] Manifest verified: ${manifestCheck.totalTracked} files cryptographically verified.\n`);

// 2. Run Scenario Parity Suite
console.log('--- Step 2: Executing Characterization Scenarios Against Golden Baseline ---');
const child = spawnSync(process.execPath, [tsx, suite], {
  cwd: root,
  env: { ...process.env, ESBUILD_BINARY_PATH: esbuildBin },
  stdio: 'inherit',
});

if (child.status !== 0) {
  console.error('\n[ORACLE VERIFICATION FAILED] Behavioral divergence detected against golden baseline.\n');
  process.exit(child.status ?? 1);
}

console.log('\n[ORACLE VERIFICATION PASSED] 100% Behavioral parity confirmed against golden baseline.\n');
