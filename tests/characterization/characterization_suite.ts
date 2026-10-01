/**
 * BEHAVIORAL FREEZE CHARACTERIZATION SUITE
 *
 * Executes all 16 characterization scenarios and verifies them against
 * the frozen golden reference traces using the ParityComparator.
 */

import { CharacterizationHarness } from './characterizationHarness';
import { CHARACTERIZATION_SCENARIOS } from './scenarios';

const harness = new CharacterizationHarness();

let totalPassed = 0;
let totalFailed = 0;
const failures: Array<{ scenarioId: string; summary: string }> = [];

console.log(`Running ${CHARACTERIZATION_SCENARIOS.length} behavioral freeze characterization scenarios...\n`);

for (const scenario of CHARACTERIZATION_SCENARIOS) {
  const result = harness.verifyScenario(scenario);
  if (result.passed) {
    totalPassed++;
    console.log(`  [PASS] ${scenario.id.padEnd(30)} ${result.summary}`);
  } else {
    totalFailed++;
    failures.push({ scenarioId: scenario.id, summary: result.summary });
    console.error(`  [FAIL] ${scenario.id.padEnd(30)} ${result.summary}`);
  }
}

console.log('\n----------------------------------------------------------------');
console.log(`SUMMARY: ${totalPassed} Passed, ${totalFailed} Failed (Total ${CHARACTERIZATION_SCENARIOS.length})`);
console.log('----------------------------------------------------------------\n');

if (totalFailed > 0) {
  console.error('[ERROR] The following scenarios diverged from the golden baseline:');
  for (const f of failures) {
    console.error(`\n>>> SCENARIO: ${f.scenarioId}`);
    console.error(f.summary);
  }
  process.exit(1);
} else {
  console.log('ALL BEHAVIORAL FREEZE SCENARIOS MATCH GOLDEN BASELINE.');
}
