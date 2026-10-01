/**
 * MANIFEST INTEGRITY TEST
 *
 * Verifies that the repository matches GOLDEN_MANIFEST.sha256.
 * Fails if any golden trace, behavior registry, campaign math tape,
 * or tolerance policy file has been modified without deliberate CLI update.
 */

import { verifyManifest } from '../../scripts/update-manifest.mjs';
import path from 'path';

console.log('\n--- Running Cryptographic Manifest Integrity Audit (GOLDEN_MANIFEST.sha256) ---');

const root = path.resolve(process.cwd());
const result = verifyManifest(root);

if (!result.manifestFound) {
  throw new Error('[MANIFEST ERROR] GOLDEN_MANIFEST.sha256 not found');
}

if (!result.valid) {
  if (result.missingFiles.length > 0) {
    console.error('Missing tracked files:', result.missingFiles);
  }
  if (result.mismatchedFiles.length > 0) {
    console.error('Mismatched/tampered files:', result.mismatchedFiles);
  }
  throw new Error(`[MANIFEST ERROR] Cryptographic manifest verification failed for ${result.mismatchedFiles.length} file(s)!`);
}

console.log(`[PASS] Manifest Integrity Certified: All ${result.totalTracked} authoritative assets match SHA-256 baseline.\n`);
