/**
 * GOLDEN MANIFEST CRYPTOGRAPHIC ANCHOR
 *
 * Computes and verifies SHA-256 hashes of all authoritative characterization assets:
 * - Approved Golden Traces (26 canonical scenarios)
 * - Behavioral Registry (behavioral-freeze-r1.json)
 * - Tolerance Policy (tolerancePolicy.json)
 * - 30-Level Campaign Math Tape (campaign_math_tape.json)
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import path from 'path';

export const MANIFEST_FILE = 'GOLDEN_MANIFEST.sha256';

export const TRACKED_STATIC_FILES = [
  'tests/characterization/behavioral-freeze-r1.json',
  'tests/characterization/campaign_math_tape.json',
  'tests/characterization/tolerancePolicy.json',
];

export function getTrackedFiles(rootDir: string = process.cwd()): string[] {
  const tracesDir = path.join(rootDir, 'tests/characterization/golden_traces');
  const traceFiles = existsSync(tracesDir)
    ? readdirSync(tracesDir)
        .filter((f) => f.endsWith('.json'))
        .sort()
        .map((f) => path.join('tests/characterization/golden_traces', f))
    : [];

  return [...TRACKED_STATIC_FILES, ...traceFiles].sort();
}

export function computeFileSha256(filePath: string, rootDir: string = process.cwd()): string {
  const absPath = path.resolve(rootDir, filePath);
  const data = readFileSync(absPath);
  return createHash('sha256').update(data).digest('hex');
}

export function generateManifestContent(rootDir: string = process.cwd()): string {
  const files = getTrackedFiles(rootDir);
  const lines: string[] = [
    '# JUMPMATH BEHAVIORAL FREEZE AUTHORITATIVE MANIFEST',
    `# Generated: ${new Date().toISOString()}`,
    '# DO NOT EDIT MANUALLY. Update via: npm run behavioral-freeze:update -- --confirm',
    '',
  ];

  for (const relPath of files) {
    const hash = computeFileSha256(relPath, rootDir);
    // Standard sha256sum format: hash  path (two spaces)
    lines.push(`${hash}  ${relPath}`);
  }

  return lines.join('\n') + '\n';
}

export function writeManifest(rootDir: string = process.cwd()): string {
  const content = generateManifestContent(rootDir);
  const targetPath = path.resolve(rootDir, MANIFEST_FILE);
  writeFileSync(targetPath, content, 'utf8');
  return targetPath;
}

export interface ManifestVerificationResult {
  valid: boolean;
  totalTracked: number;
  missingFiles: string[];
  mismatchedFiles: string[];
  manifestFound: boolean;
}

export function verifyManifest(rootDir: string = process.cwd()): ManifestVerificationResult {
  const manifestPath = path.resolve(rootDir, MANIFEST_FILE);
  if (!existsSync(manifestPath)) {
    return {
      valid: false,
      totalTracked: 0,
      missingFiles: [],
      mismatchedFiles: [],
      manifestFound: false,
    };
  }

  const content = readFileSync(manifestPath, 'utf8');
  const lines = content.split('\n');
  const expectedMap = new Map<string, string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split(/\s+/);
    if (parts.length >= 2) {
      const hash = parts[0];
      const relPath = parts[1];
      expectedMap.set(relPath, hash);
    }
  }

  const missingFiles: string[] = [];
  const mismatchedFiles: string[] = [];
  const currentTracked = getTrackedFiles(rootDir);

  for (const relPath of currentTracked) {
    const expectedHash = expectedMap.get(relPath);
    if (!expectedHash) {
      missingFiles.push(relPath);
      continue;
    }
    const currentHash = computeFileSha256(relPath, rootDir);
    if (currentHash !== expectedHash) {
      mismatchedFiles.push(relPath);
    }
  }

  for (const [recordedPath] of expectedMap.entries()) {
    const absPath = path.resolve(rootDir, recordedPath);
    if (!existsSync(absPath)) {
      missingFiles.push(recordedPath);
    }
  }

  const valid = missingFiles.length === 0 && mismatchedFiles.length === 0;

  return {
    valid,
    totalTracked: expectedMap.size,
    missingFiles,
    mismatchedFiles,
    manifestFound: true,
  };
}
