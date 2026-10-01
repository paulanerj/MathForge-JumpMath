/**
 * FALSE DIVERGENCE AUDIT
 *
 * Verifies that cosmetic/implementation noise (timestamps, cosmetic particle coords,
 * internal ephemeral IDs, float jitter within documented tolerance) does NOT trigger parity failure.
 */

import { ParityComparator } from './parityComparator';
import { CanonicalObservation } from './canonicalObservation';
import { CharacterizationHarness } from './characterizationHarness';
import { CHARACTERIZATION_SCENARIOS } from './scenarios';

function assert(condition: boolean, msg: string): asserts condition {
  if (!condition) throw new Error(`[FALSE DIVERGENCE AUDIT FAILED] ${msg}`);
}

console.log('\n--- Running False Divergence Audit ---');

const harness = new CharacterizationHarness();
const comparator = new ParityComparator();
const baseScenario = CHARACTERIZATION_SCENARIOS[0]; // APP_SESSION_LIFECYCLE
const golden = harness.loadGoldenTrace(baseScenario.id)!;

assert(golden !== null, 'Golden trace must exist');

function cloneObservations(obs: CanonicalObservation[]): CanonicalObservation[] {
  return JSON.parse(JSON.stringify(obs));
}

// Case 1: Float noise strictly within documented tolerances
{
  const modified = cloneObservations(golden.observations);
  // Add +0.2px float jitter to player coordinates (tolerance is +/- 1.0px)
  modified[1].player.x += 0.2;
  modified[1].player.y -= 0.15;
  // Add +0.02s jitter to timeLeft (tolerance is +/- 0.05s)
  modified[1].session.timeLeft += 0.02;
  // Add +0.3px to waveY (tolerance is +/- 1.0px)
  modified[1].plasma.waveY += 0.3;
  // Add +0.5px to nextRowMinX (tolerance is +/- 2.0px)
  modified[1].framing.nextRowMinX += 0.5;

  const result = comparator.compareTraces(modified, golden);
  assert(result.passed, `Sub-tolerance float jitter must pass, but got: ${result.summary}`);
  console.log('  [PASS] Case 1: Sub-tolerance float jitter safely absorbed.');
}

// Case 2: Cosmetic Domain Event Non-Gameplay Metadata
{
  const modified = cloneObservations(golden.observations);
  // Add an extra cosmetic diagnostic log event
  modified[0].domainEvents.push({
    seq: 9999,
    type: 'COSMETIC_PARTICLE_EMITTED',
    payload: { particleCount: 14, color: '#ffaa00', timestamp: 123456789 },
  });

  const result = comparator.compareTraces(modified, golden);
  assert(result.passed, `Cosmetic event payload must not fail parity, got: ${result.summary}`);
  console.log('  [PASS] Case 2: Cosmetic particle telemetry safely ignored.');
}

// Case 3: Death Glitch Jitter During DYING Status
{
  const modified = cloneObservations(golden.observations);
  // Simulate status = 'dying' with random glitch displacement on player.x
  modified[1].session.status = 'dying';
  modified[1].player.x += 4.5; // Glitch displacement
  const goldenDying = cloneObservations(golden.observations);
  goldenDying[1].session.status = 'dying';

  const result = comparator.compareTraces(modified, { ...golden, observations: goldenDying });
  assert(result.passed, `Cosmetic death glitch during DYING status must be ignored, got: ${result.summary}`);
  console.log('  [PASS] Case 3: Cosmetic death glitch during DYING status safely ignored.');
}

console.log('[PASS] All False Divergence Audit checks passed: Cosmetic noise does NOT cause false alarms.\n');
