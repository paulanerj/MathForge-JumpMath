/**
 * GOLDEN GENERATION SCRIPT
 *
 * Runs all characterization scenarios on the legacy R2 engine and serializes
 * canonical observations to tests/characterization/golden_traces/<scenarioId>.json.
 */

import { CharacterizationHarness } from './characterizationHarness';
import { CHARACTERIZATION_SCENARIOS } from './scenarios';

const harness = new CharacterizationHarness();

console.log(`Generating golden traces for ${CHARACTERIZATION_SCENARIOS.length} scenarios...`);

for (const scenario of CHARACTERIZATION_SCENARIOS) {
  process.stdout.write(`  - Recording ${scenario.id}... `);
  const { trace } = harness.executeScenario(scenario);
  harness.saveGoldenTrace(trace);
  console.log(`[OK] (${trace.observations.length} observations)`);
}

console.log('All golden traces successfully generated and saved.');
