/**
 * CHARACTERIZATION HARNESS
 *
 * Authoritative runner executing CharacterizationScenarios on GameEngine,
 * producing canonical traces, and comparing them against versioned golden oracles.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupHeadlessEnv } from '../mock_env';
import { GameEngine } from '../../src/engine/GameEngine';
import { LEVEL_DATABASE } from '../../src/engine/LevelDatabase';
import { MathChallengeEngine } from '../../src/math/MathChallengeEngine';
import { SeedableMathRng } from '../../src/math/MathRng';
import { CharacterizationScenario } from './scenarioModel';
import { CanonicalObservation, GoldenScenarioTrace } from './canonicalObservation';
import { LegacyObservationAdapter } from './legacyObservationAdapter';
import { ParityComparator, ComparisonResult } from './parityComparator';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GOLDEN_DIR = path.join(__dirname, 'golden_traces');

export class CharacterizationHarness {
  private adapter = new LegacyObservationAdapter();
  private comparator = new ParityComparator();

  executeScenario(scenario: CharacterizationScenario): {
    trace: GoldenScenarioTrace;
    observations: CanonicalObservation[];
  } {
    const env = setupHeadlessEnv();
    const canvas = new env.MockCanvas() as any;
    canvas.width = scenario.viewport.width;
    canvas.height = scenario.viewport.height;
    canvas.setBoundingRect(0, 0, scenario.viewport.width, scenario.viewport.height);

    const schema = LEVEL_DATABASE.find((l) => l.id === scenario.levelId) || LEVEL_DATABASE[0];
    const mathRng = new SeedableMathRng(scenario.seed);
    const mathEngine = new MathChallengeEngine({ rng: mathRng });

    const engine = new GameEngine(canvas as HTMLCanvasElement, schema, undefined, mathEngine);
    engine.start();

    this.adapter.resetEvents();
    this.adapter.recordEvent('SESSION_INITIALIZED', { levelId: schema.id, seed: scenario.seed });

    const observations: CanonicalObservation[] = [];

    for (let stepIdx = 0; stepIdx < scenario.steps.length; stepIdx++) {
      const step = scenario.steps[stepIdx];

      switch (step.type) {
        case 'ADVANCE_TIME': {
          const iterations = step.steps ?? 1;
          for (let i = 0; i < iterations; i++) {
            engine.update(step.dt);
            engine.draw();
          }
          break;
        }

        case 'SELECT_CORRECT_ANSWER': {
          const candidates = engine.platformManager.platforms.filter(
            (p) => p.rowIdx === step.rowIdx && p.isCorrect && !p.shattered
          );
          if (candidates.length > 0) {
            const target = candidates[0];
            const cx = target.x - engine.camera.x + canvas.width / 2;
            const cy = target.y - engine.camera.y + canvas.height / 2;
            this.adapter.recordEvent('PLATFORM_SELECTED', {
              rowIdx: step.rowIdx,
              platformId: target.id,
              val: target.val,
              isCorrect: true,
            });
            engine.handleInput(cx, cy);
          }
          break;
        }

        case 'SELECT_WRONG_ANSWER': {
          const candidates = engine.platformManager.platforms.filter(
            (p) => p.rowIdx === step.rowIdx && !p.isCorrect && !p.shattered
          );
          if (candidates.length > 0) {
            const target = candidates[0];
            const cx = target.x - engine.camera.x + canvas.width / 2;
            const cy = target.y - engine.camera.y + canvas.height / 2;
            this.adapter.recordEvent('PLATFORM_SELECTED', {
              rowIdx: step.rowIdx,
              platformId: target.id,
              val: target.val,
              isCorrect: false,
            });
            engine.handleInput(cx, cy);
          }
          break;
        }

        case 'SELECT_PLATFORM_AT': {
          engine.handleInput(step.clientX, step.clientY);
          break;
        }

        case 'TRIGGER_DEATH': {
          engine.triggerDeath(step.cause === 'wave' ? 'wave' : 'void', step.cause);
          break;
        }

        case 'RESIZE_VIEWPORT': {
          canvas.width = step.width;
          canvas.height = step.height;
          canvas.setBoundingRect(0, 0, step.width, step.height);
          break;
        }

        case 'CAPTURE_OBSERVATION': {
          const obs = this.adapter.captureObservation(engine, scenario.id, stepIdx, step.label);
          observations.push(obs);
          break;
        }
      }
    }

    let finalOutcome: GoldenScenarioTrace['finalOutcome'] = 'READY';
    if (engine.state.status === 'levelclear') finalOutcome = 'WIN';
    else if (engine.state.status === 'gameover' || engine.state.status === 'dying') finalOutcome = 'DEATH';
    else finalOutcome = 'COMPLETED';

    const trace: GoldenScenarioTrace = {
      schemaVersion: '1.0.0',
      baselineId: 'JUMPMATH-R2-PHASE-4C-FROZEN',
      scenarioId: scenario.id,
      levelId: scenario.levelId,
      seed: scenario.seed,
      viewport: scenario.viewport,
      initialSettings: scenario.initialSettings,
      observations,
      finalOutcome,
    };

    engine.cleanup();
    return { trace, observations };
  }

  getGoldenPath(scenarioId: string): string {
    return path.join(GOLDEN_DIR, `${scenarioId}.json`);
  }

  loadGoldenTrace(scenarioId: string): GoldenScenarioTrace | null {
    const filePath = this.getGoldenPath(scenarioId);
    if (!fs.existsSync(filePath)) return null;
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  }

  saveGoldenTrace(trace: GoldenScenarioTrace): void {
    if (!fs.existsSync(GOLDEN_DIR)) {
      fs.mkdirSync(GOLDEN_DIR, { recursive: true });
    }
    const filePath = this.getGoldenPath(trace.scenarioId);
    fs.writeFileSync(filePath, JSON.stringify(trace, null, 2), 'utf8');
  }

  verifyScenario(scenario: CharacterizationScenario): ComparisonResult {
    const { observations } = this.executeScenario(scenario);
    const golden = this.loadGoldenTrace(scenario.id);

    if (!golden) {
      return {
        passed: false,
        scenarioId: scenario.id,
        diffs: [
          {
            scenarioId: scenario.id,
            stepIndex: -1,
            label: 'MISSING_GOLDEN',
            fieldPath: 'golden_trace',
            expected: 'file present',
            actual: 'missing',
            message: `Golden trace missing for scenario ${scenario.id}. Run golden generator with explicit intent.`,
          },
        ],
        summary: `Golden trace missing for scenario ${scenario.id}.`,
      };
    }

    return this.comparator.compareTraces(observations, golden);
  }
}
