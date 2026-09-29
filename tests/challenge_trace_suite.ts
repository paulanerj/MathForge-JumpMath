import { setupHeadlessEnv, resetStandardViewport } from './mock_env';
import { GameEngine } from '../src/engine/GameEngine';
import { LEVEL_DATABASE } from '../src/engine/LevelDatabase';

const env = setupHeadlessEnv();

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`[TRACE] ${message}`);
}

function jumpToRest(engine: GameEngine): void {
  let elapsed = 0;
  const step = 1 / 60;
  while ((engine.state.zyx.jumping || engine.state.zyx.bouncing) && elapsed < 3) {
    engine.update(step);
    elapsed += step;
  }
}

function main() {
  const canvas = new env.MockCanvas() as HTMLCanvasElement;
  resetStandardViewport(canvas);
  const schema = LEVEL_DATABASE[0];
  const engine = new GameEngine(canvas, schema);
  const burst = engine.config.platform.initialSpawnRows;

  const spawns = engine.challengeTrace.spawns();
  assert(spawns.length === burst, `expected ${burst} initial spawns, got ${spawns.length}`);
  assert(spawns.every((s) => s.commitment === 'initial-burst'), 'initial rows must be initial-burst');
  assert(spawns.every((s) => s.attemptsBeforeGenerate === 0), 'burst exists before any attempt');
  assert(spawns.every((s) => s.options.length === 3 && s.options.filter((o) => o.isCorrect).length === 1), '3 options, 1 correct');
  assert(spawns[0].modeId === schema.mathConfig.mode, 'spawn mode matches requested schema');

  const row1 = engine.platformManager.platforms.filter((p) => p.rowIdx === 1);
  const correct = row1.find((p) => p.isCorrect);
  const wrong = row1.find((p) => !p.isCorrect);
  assert(!!correct && !!wrong, 'row 1 has a correct and a wrong platform');

  engine.executeJump(correct!);
  assert(engine.challengeTrace.pending?.challengeId === correct!.challengeId, 'tap records a motor commit');
  jumpToRest(engine);

  const attempts = engine.challengeTrace.attempts();
  assert(attempts.length === 1, `expected 1 attempt, got ${attempts.length}`);
  assert(attempts[0].correct === true && attempts[0].failureClass === 'none', 'correct landing is not a math failure');
  assert(attempts[0].tapAtMs !== null, 'tap time is kept separate from land time');
  assert(attempts[0].landAtMs >= attempts[0].tapAtMs!, 'land is not before tap');

  const after = engine.challengeTrace.spawns().filter((s) => s.commitment === 'after-resolve');
  assert(after.length === 1, 'one row generated after the graded landing');
  assert(after[0].attemptsBeforeGenerate === 1, 'that row is committed only after the attempt exists');

  const ahead = engine.challengeTrace.committedAhead(0);
  assert(ahead.length === burst, 'rows spawned before any attempt stay inside the commitment horizon');

  const nextRow = engine.state.zyx.currentRow + 1;
  const decoy = engine.platformManager.platforms.find((p) => p.rowIdx === nextRow && !p.isCorrect);
  assert(!!decoy, 'next row has a decoy');
  engine.executeJump(decoy!);
  jumpToRest(engine);
  const miss = engine.challengeTrace.attempts().at(-1)!;
  assert(miss.correct === false && miss.failureClass === 'math', 'wrong platform is a math miss, not a wave death');
  assert(engine.state.status === 'playing', 'a math miss does not kill the run');

  engine.triggerDeath('wave', 'wave');
  const survival = engine.challengeTrace.events.filter((e) => e.kind === 'survival');
  assert(survival.length === 1 && survival[0].kind === 'survival' && survival[0].failureClass === 'wave', 'wave death is survival, not another math attempt');
  const attemptCount = engine.challengeTrace.attempts().length;
  engine.triggerDeath('void', 'timer');
  assert(engine.challengeTrace.attempts().length === attemptCount, 'a second death does not invent an attempt');

  engine.cleanup();
  console.log('challenge trace suite: ok');
}

main();
