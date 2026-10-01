/**
 * Run every authoritative suite with the project-local esbuild and tsx.
 */
import { readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import path from 'path';
import { ensureEsbuild, localPackage, root } from './project-toolchain.mjs';

let tsxEsbuild;
try {
  tsxEsbuild = JSON.parse(readFileSync(path.join(root, 'node_modules/tsx/node_modules/esbuild/package.json'), 'utf8'));
} catch {
  tsxEsbuild = localPackage('esbuild').pkg;
}
const esbuildBin = ensureEsbuild(tsxEsbuild.version);
const tsx = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const suites = [
  'tests/architecture_contract_suite.ts',
  'tests/challenge_trace_suite.ts',
  'tests/math_challenge_suite.ts',
  'tests/config_authority_suite.ts',
  'tests/player_path_suite.ts',
  'tests/torture_suite.ts',
  'tests/settings_interaction_suite.ts',
  'tests/characterization/safety_test.ts',
  'tests/characterization/campaign_math_tape.ts',
  'tests/characterization/long_run_pruning_test.ts',
  'tests/characterization/false_parity_test.ts',
  'tests/characterization/false_divergence_test.ts',
  'tests/characterization/framerate_dependency_test.ts',
  'tests/characterization/oracle_mutation_gate.ts',
  'tests/characterization/manifest_integrity_test.ts',
];

const only = process.argv.find((arg) => arg.startsWith('--only='));
const selected = only ? suites.filter((suite) => suite.includes(only.slice('--only='.length))) : suites;
if (selected.length === 0) {
  console.error(`No suite matched ${only}`);
  process.exit(1);
}

for (const suite of selected) {
  console.log(`\n===== ${suite} =====`);
  const child = spawnSync(process.execPath, [tsx, suite], {
    cwd: root,
    env: { ...process.env, ESBUILD_BINARY_PATH: esbuildBin },
    stdio: 'inherit',
  });
  if (child.status !== 0) process.exit(child.status ?? 1);
}

console.log('\nALL AUTHORITATIVE SUITES PASSED');
console.log(selected.join('\n'));
