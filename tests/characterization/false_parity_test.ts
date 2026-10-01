/**
 * FALSE PARITY AUDIT
 *
 * Verifies that the parity comparator detects semantic differences between runs
 * even when both runs conclude with the same high-level 'WIN' outcome.
 */

import { ParityComparator } from './parityComparator';
import { GoldenScenarioTrace, CanonicalObservation } from './canonicalObservation';
import { CharacterizationHarness } from './characterizationHarness';
import { CHARACTERIZATION_SCENARIOS } from './scenarios';

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`[FALSE PARITY AUDIT FAILED] ${msg}`);
}

console.log('\n--- Running False Parity Audit ---');

const harness = new CharacterizationHarness();
const comparator = new ParityComparator();
const baseScenario = CHARACTERIZATION_SCENARIOS[0]; // APP_SESSION_LIFECYCLE
const golden = harness.loadGoldenTrace(baseScenario.id)!;

assert(golden !== null, 'Golden trace must exist');

function cloneObservations(obs: CanonicalObservation[]): CanonicalObservation[] {
  return JSON.parse(JSON.stringify(obs));
}

// Case 1: Wrong Math Challenge Prompt/Answer
{
  const modified = cloneObservations(golden.observations);
  modified[1].activeChallenge!.correctAnswer += 5; // Semantic arithmetic drift
  const result = comparator.compareTraces(modified, golden);
  assert(!result.passed, 'Comparator must fail when correct answer differs');
  assert(result.diffs.some((d) => d.fieldPath.includes('activeChallenge.correctAnswer')), 'Diff must pinpoint correctAnswer');
  console.log('  [PASS] Case 1: Math challenge divergence correctly detected.');
}

// Case 2: Platform Value Mutation
{
  const modified = cloneObservations(golden.observations);
  modified[1].actionableRowPlatforms[0].val += 99; // Corrupted decoy value
  const result = comparator.compareTraces(modified, golden);
  assert(!result.passed, 'Comparator must fail when platform value differs');
  assert(result.diffs.some((d) => d.fieldPath.includes('platform[0].val')), 'Diff must pinpoint platform value');
  console.log('  [PASS] Case 2: Platform option value divergence correctly detected.');
}

// Case 3: Player Row Divergence
{
  const modified = cloneObservations(golden.observations);
  modified[2].player.currentRow = 9; // Deviate from expected
  const result = comparator.compareTraces(modified, golden);
  assert(!result.passed, 'Comparator must fail when player row differs');
  assert(result.diffs.some((d) => d.fieldPath === 'player.currentRow'), 'Diff must pinpoint player currentRow');
  console.log('  [PASS] Case 3: Player row divergence correctly detected.');
}

// Case 4: Plasma Wave Gap Divergence
{
  const modified = cloneObservations(golden.observations);
  modified[1].plasma.waveY -= 50; // Wave Y drifted by 50px
  const result = comparator.compareTraces(modified, golden);
  assert(!result.passed, 'Comparator must fail when plasma wave Y exceeds tolerance');
  assert(result.diffs.some((d) => d.fieldPath === 'plasma.waveY'), 'Diff must pinpoint plasma waveY');
  console.log('  [PASS] Case 4: Plasma wave position divergence correctly detected.');
}

// Case 5: Actionable Row Framing Divergence
{
  const modified = cloneObservations(golden.observations);
  modified[1].framing.isFramedCorrectly = false; // Viewport clipping
  const result = comparator.compareTraces(modified, golden);
  assert(!result.passed, 'Comparator must fail when framing status differs');
  assert(result.diffs.some((d) => d.fieldPath === 'framing.isFramedCorrectly'), 'Diff must pinpoint framing');
  console.log('  [PASS] Case 5: Actionable-row framing divergence correctly detected.');
}

console.log('[PASS] All False Parity Audit checks passed: Superficial "WIN" parity is strictly rejected.\n');
