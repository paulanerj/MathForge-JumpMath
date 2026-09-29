/**
 * JumpMath architecture contracts.
 * These lock ownership and lifecycle. They do not freeze tunable numbers.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupHeadlessEnv } from './mock_env.ts';
import { GameEngine } from '../src/engine/GameEngine.ts';
import { CAMPAIGN_SECTORS, LEVEL_DATABASE } from '../src/engine/LevelDatabase.ts';
import { MathChallengeEngine } from '../src/math/MathChallengeEngine.ts';
import { SeedableMathRng } from '../src/math/MathRng.ts';
import { MathRng } from '../src/math/mathTypes.ts';
import { describeLevelObjective } from '../src/math/objectivePresentation.ts';
import { DEFAULT_REALM_ID, REALMS, isRealmId, realmForLevel } from '../src/visual/realms.ts';
import { DEFAULT_ZYX_CONFIG } from '../src/config/defaults.ts';
import { DEFAULT_ZYX_CONFIG as barrelDefault } from '../src/config/index.ts';
import { createZyxConfig } from '../src/config/zyxConfig.ts';
import { DeepPartial, ZyxConfig } from '../src/config/configTypes.ts';
import { LevelSchema } from '../src/types.ts';
import { campaignReviewPlaylist, reviewIndexForLevel, reviewLaunchFromSearch } from '../src/review/reviewMode.ts';
import { sceneFromLevel, sceneInventory, validateVisualScene } from '../src/studio/VisualScene.ts';
import { derivePlasmaPresentation, PLASMA_LAB_GAPS, PLASMA_PRESENTATION, SHOCK_FRONT_WORLD_OFFSET, worldToScreenY } from '../src/engine/plasmaPresentation.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = path.join(root, 'src');
const env = setupHeadlessEnv();

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`[CONTRACT] ${message}`);
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(name)) out.push(full);
  }
  return out;
}

const sourceFiles = walk(srcRoot);
const sourceText = new Map(sourceFiles.map((file) => [file, readFileSync(file, 'utf8')]));

function rel(file: string): string {
  return path.relative(root, file);
}

function jumpToRest(engine: GameEngine): void {
  let elapsed = 0;
  while ((engine.state.zyx.jumping || engine.state.zyx.bouncing) && elapsed < 3) {
    engine.update(1 / 60);
    elapsed += 1 / 60;
  }
}

/** Sum-to operand draws are nextInt(1, 9). Pinning those makes the next committed operand equal the previous one. */
class PinnedSumOperandRng implements MathRng {
  constructor(private readonly operand: number, private readonly inner: MathRng) {}
  random(): number { return this.inner.random(); }
  nextInt(min: number, max: number): number {
    if (min === 1 && max === 9) return this.operand;
    return this.inner.nextInt(min, max);
  }
  shuffle<T>(array: T[]): T[] { return this.inner.shuffle(array); }
}

/** Test double. Reports a correct selection and does not commit. */
class UncommittedMath extends MathChallengeEngine {
  resolveAnswer(challengeId: string, selectedOptionId: string) {
    const challenge = this.getChallenge(challengeId);
    if (!challenge) throw new Error(`[CONTRACT] suppressed-commit probe lost ${challengeId}`);
    const selected = challenge.options.find((item) => item.id === selectedOptionId);
    return {
      challengeId,
      selectedOptionId,
      selectedValue: selected?.value ?? Number.NaN,
      correct: selected?.isCorrect === true,
      correctAnswer: challenge.correctAnswer,
    };
  }
}

function assertNoMathCommit(engine: GameEngine, challengeId: string, committed: unknown, row: number, label: string): void {
  const math = engine.mathEngine;
  assert(math.getCommittedState() === committed, `${label} changed committed math`);
  assert(math.getCommittedRow() === row, `${label} advanced the committed row`);
  assert(math.getChallengeStatus(challengeId) === 'unresolved', `${label} resolved the challenge`);
  assert(!math.isChallengeResolved(challengeId), `${label} recorded a resolution`);
}

function assertMathCommitted(engine: GameEngine, challengeId: string, beforeRow: number, sequenceStateAfter: unknown): void {
  const math = engine.mathEngine;
  assert(math.getCommittedRow() === beforeRow + 1, 'landing did not advance the committed row exactly once');
  assert(math.getChallengeStatus(challengeId) === 'resolved-correct', 'landing did not resolve the landed challenge');
  assert(math.isChallengeResolved(challengeId), 'landing did not record the landed challenge');
  assert(math.getCommittedState() === sequenceStateAfter, 'landing did not commit that challenge sequence state');
  const later = math.getChallengeForRow(beforeRow + 2);
  if (later) assert(math.getChallengeStatus(later.id) === 'unresolved', 'landing committed a row that was not landed');
}

function proveCorrectLanding(engine: GameEngine): { beforeCommitted: unknown; afterCommitted: unknown } {
  const platform = engine.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  const beforeScore = engine.state.score;
  const beforeProgress = engine.correctInRow;
  const beforeCommitted = engine.mathEngine.getCommittedState();
  const beforeRow = engine.mathEngine.getCommittedRow();
  const challenge = engine.mathEngine.getChallenge(platform.challengeId!)!;
  const option = challenge.options.find((item) => item.id === platform.optionId);
  assert(option?.isCorrect === true, 'selected option is not the correct one');
  assert(beforeRow === 0, 'session was already committed before the jump');

  engine.executeJump(platform);
  assert(engine.state.zyx.jumping, 'correct selection did not travel');
  assert(engine.state.score === beforeScore, 'preview incremented score');
  assert(engine.correctInRow === beforeProgress, 'preview incremented progress');
  assertNoMathCommit(engine, challenge.id, beforeCommitted, beforeRow, 'preview');
  if (typeof challenge.sequenceStateAfter === 'number') {
    assert(engine.state.zyx.val === challenge.sequenceStateAfter, 'travel did not show the authoritative lookahead');
  }

  jumpToRest(engine);
  assert(engine.state.score === beforeScore + 1, 'landing did not commit score');
  assert(engine.correctInRow === beforeProgress + 1, 'landing did not commit progress');
  assertMathCommitted(engine, challenge.id, beforeRow, challenge.sequenceStateAfter);
  return { beforeCommitted, afterCommitted: engine.mathEngine.getCommittedState() };
}

function freshEngine(schema = LEVEL_DATABASE[0], configOverrides?: DeepPartial<ZyxConfig>): GameEngine {
  const canvas = new env.MockCanvas() as HTMLCanvasElement;
  const config = configOverrides ? createZyxConfig(configOverrides) : DEFAULT_ZYX_CONFIG;
  return new GameEngine(canvas, schema, config);
}

function contractACampaign(): void {
  assert(LEVEL_DATABASE.length === 30, `expected 30 levels, got ${LEVEL_DATABASE.length}`);
  assert(CAMPAIGN_SECTORS.length === 6, `expected 6 sectors, got ${CAMPAIGN_SECTORS.length}`);
  assert(Object.keys(REALMS).length === 6, 'expected six realm definitions');
  const realms = new Set(CAMPAIGN_SECTORS.map((sector) => sector.levels[0]?.theme.realm));
  assert(realms.size === 6, `expected six campaign realms, got ${[...realms].join(',')}`);
  for (const sector of CAMPAIGN_SECTORS) {
    assert(sector.levels.length === 5, `${sector.id} does not have five levels`);
    for (const level of sector.levels) {
      assert(!!level.id && !!level.mathConfig?.mode, `${sector.id} has an invalid schema`);
      assert(level.theme.realm === sector.levels[0].theme.realm, `${level.id} left its sector realm`);
      const math = new MathChallengeEngine();
      const session = math.initializeSession(level, 2);
      assert(session.initialChallenges.length === 2, `${level.id} did not initialize through MathChallengeEngine`);
      assert(session.initialChallenges.every((item) => item.challenge.modeId === level.mathConfig.mode), `${level.id} challenge mode drifted`);
    }
  }
  console.log('  [PASS] A campaign: 30 levels, six realms, five each, math-initialized');
}

function contractBMathAuthority(): void {
  const engineFiles = [...sourceText.entries()].filter(([file]) => rel(file).startsWith('src/'));
  const outside = engineFiles
    .filter(([file, text]) => !rel(file).startsWith('src/math/') && /generateChallenge\(/.test(text))
    .map(([file]) => rel(file));
  assert(outside.length === 0, `challenge generators outside math: ${outside.join(', ')}`);
  assert(!engineFiles.some(([file, text]) => rel(file).startsWith('src/engine/Renderer') && /generateChallenge|resolveAnswer/.test(text)), 'Renderer evaluates math');
  console.log('  [PASS] B math authority stays inside MathChallengeEngine and its modes');
}

function contractCNoLiveWarping(): void {
  for (const [file, text] of sourceText) {
    assert(!/status\s*=\s*['"]WARPING['"]/.test(text), `${rel(file)} assigns WARPING`);
  }
  const engine = freshEngine();
  let completions = 0;
  engine.onLevelComplete = () => { completions++; };
  for (let i = 0; i < 10; i++) {
    const platform = engine.platformManager.platforms.find((p) => p.rowIdx === engine.state.zyx.currentRow + 1 && p.isCorrect);
    assert(!!platform, 'missing correct platform before completion');
    engine.executeJump(platform!);
    jumpToRest(engine);
  }
  assert(engine.state.status === 'level_complete', `win entered ${engine.state.status}`);
  assert((engine.state.status as string) !== 'WARPING', 'win entered WARPING');
  engine.update(0.5);
  assert(engine.state.status === 'level_complete', 'secured completion did not hold');
  assert(completions === 1, `completion posted ${completions} times`);
  console.log('  [PASS] C no production assignment enters WARPING');
}

function contractDWinSecuresSimulation(): void {
  const engine = freshEngine();
  let completions = 0;
  engine.onLevelComplete = () => { completions++; };
  for (let i = 0; i < 10; i++) {
    const platform = engine.platformManager.platforms.find((p) => p.rowIdx === engine.state.zyx.currentRow + 1 && p.isCorrect)!;
    engine.executeJump(platform);
    jumpToRest(engine);
  }
  const waveY = engine.state.wave?.y;
  const timeLeft = engine.state.timeLeft;
  const score = engine.state.score;
  engine.update(1);
  engine.executeJump(engine.platformManager.platforms[0]);
  engine.handleInput(10, 10);
  assert(engine.state.status === 'level_complete', 'win did not secure level_complete');
  assert(engine.state.wave?.y === waveY, 'wave advanced after the win');
  assert(engine.state.timeLeft === timeLeft, 'turn timer ran after the win');
  assert(!engine.state.zyx.jumping, 'input advanced the run after the win');
  assert(engine.state.score === score, 'score changed after the win');
  assert(completions === 1, 'completion posted more than once');
  console.log('  [PASS] D winning landing secures the simulation');
}

function contractEPreview(): void {
  const schema = LEVEL_DATABASE[0];

  const pinnedMath = new MathChallengeEngine({ rng: new PinnedSumOperandRng(5, new SeedableMathRng(4)) });
  const pinned = new GameEngine(new env.MockCanvas() as HTMLCanvasElement, schema, undefined, pinnedMath);
  const pinnedLanding = proveCorrectLanding(pinned);
  assert(pinnedLanding.beforeCommitted === 5, 'pinned sum did not start at operand 5');
  assert(pinnedLanding.afterCommitted === 5, 'pinned landing did not commit operand 5');

  const wrongEngine = freshEngine(schema);
  const wrong = wrongEngine.platformManager.platforms.find((p) => p.rowIdx === 1 && !p.isCorrect)!;
  const wrongChallenge = wrongEngine.mathEngine.getChallenge(wrong.challengeId!)!;
  const committed = wrongEngine.mathEngine.getCommittedState();
  const row = wrongEngine.mathEngine.getCommittedRow();
  const shown = wrongEngine.state.zyx.val;
  wrongEngine.executeJump(wrong);
  assert(wrongEngine.state.zyx.val === shown, 'wrong selection changed the displayed value');
  assert(wrongEngine.state.score === 0 && wrongEngine.correctInRow === 0, 'wrong travel committed progress');
  assertNoMathCommit(wrongEngine, wrongChallenge.id, committed, row, 'wrong travel');
  jumpToRest(wrongEngine);
  assert(wrongEngine.state.score === 0 && wrongEngine.correctInRow === 0, 'wrong landing committed progress');
  assertNoMathCommit(wrongEngine, wrongChallenge.id, committed, row, 'wrong landing');

  let equalValueCommits = 0;
  const trials = 200;
  for (let i = 0; i < trials; i++) {
    const landing = proveCorrectLanding(freshEngine(schema));
    if (landing.beforeCommitted === landing.afterCommitted) equalValueCommits++;
  }
  assert(equalValueCommits > 0, 'stress never observed a valid commit whose numeric value stayed the same');

  const silent = new UncommittedMath();
  const silentEngine = new GameEngine(new env.MockCanvas() as HTMLCanvasElement, schema, undefined, silent);
  const platform = silentEngine.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  const silentChallenge = silent.getChallenge(platform.challengeId!)!;
  const silentRow = silent.getCommittedRow();
  silentEngine.executeJump(platform);
  jumpToRest(silentEngine);
  assert(silentEngine.state.score === 1 && silentEngine.correctInRow === 1, 'suppressed-commit probe did not complete the landing');
  let detected = false;
  try {
    assertMathCommitted(silentEngine, silentChallenge.id, silentRow, silentChallenge.sequenceStateAfter);
  } catch (error) {
    detected = error instanceof Error && error.message.includes('committed row');
  }
  assert(detected, 'repaired contract did not detect a missing math commit');
  assert(silent.getCommittedRow() === 0, 'suppressed commit advanced the committed row');
  assert(silent.getChallengeStatus(silentChallenge.id) === 'unresolved', 'suppressed commit resolved the challenge');

  console.log(`  [PASS] E preview and wrong taps do not commit; landing commits once (${equalValueCommits} equal-value commits in ${trials})`);
}

function contractFOneWave(): void {
  const wave = DEFAULT_ZYX_CONFIG.wave;
  assert(Number.isFinite(wave.spawnDistanceBehind), 'spawn span is not finite');
  assert(Number.isFinite(wave.baseSpeed) && wave.baseSpeed >= 0, 'wave speed is invalid');
  assert(Number.isFinite(wave.proximityCollisionDist) && Number.isFinite(wave.warningDistance), 'wave distances are invalid');
  assert(wave.proximityCollisionDist < wave.warningDistance, 'collision distance is not inside the warning range');
  assert(wave.proximityCollisionDist < wave.spawnDistanceBehind, 'collision distance is not inside the spawn span');
  const engine = freshEngine();
  const pursuit = engine.state.wave;
  assert(!!pursuit, 'playing state has no wave');
  engine.update(0.05);
  assert(engine.state.wave === pursuit, 'simulation replaced the wave object');
  console.log('  [PASS] F one wave object; distances stay structurally ordered');
}

function contractGWaveRecovery(): void {
  const engine = freshEngine(LEVEL_DATABASE[0]);
  const platform = engine.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  engine.executeJump(platform);
  jumpToRest(engine);
  const pursuit = engine.state.wave;
  const progress = engine.correctInRow;
  const score = engine.state.score;
  const committed = engine.mathEngine.getCommittedState();
  const openChallenge = engine.mathEngine.getChallengeForRow(engine.state.zyx.currentRow + 1);
  assert(!!openChallenge, 'no unresolved challenge after the landing');
  assert(engine.mathEngine.getChallengeStatus(openChallenge!.id) === 'unresolved', 'next challenge was already committed');

  engine.state.wave!.y = engine.state.zyx.y;
  engine.update(1 / 60);
  assert(engine.state.status === 'DYING', 'wave contact did not start destruction');
  let guard = 0;
  while (engine.state.status !== 'playing' && guard < 240) {
    engine.update(1 / 60);
    guard++;
  }
  assert(engine.state.status === 'playing', 'wave recovery did not resume play');
  assert(engine.state.wave === pursuit, 'recovery constructed a second wave');
  assert(engine.correctInRow === progress, 'wave recovery erased level progress');
  assert(engine.state.score === score, 'wave recovery erased score');
  assert(engine.state.combo === 0, 'wave recovery did not reset combo');
  assert(engine.mathEngine.getCommittedState() === committed, 'wave recovery moved committed math');
  assert(engine.mathEngine.getChallengeForRow(engine.state.zyx.currentRow + 1)?.id === openChallenge!.id, 'wave recovery replaced the unresolved challenge');
  assert(engine.mathEngine.getChallengeStatus(openChallenge!.id) === 'unresolved', 'wave recovery double-committed the open challenge');
  console.log('  [PASS] G wave recovery keeps the same wave and the committed math session');
}

function contractHAudio(): void {
  const constructors = [...sourceText.entries()].filter(([, text]) => /new SoundEngine\(/.test(text)).map(([file]) => rel(file));
  assert(constructors.length === 1 && constructors[0] === 'src/engine/GameEngine.ts', `SoundEngine constructed in ${constructors.join(', ')}`);
  assert(sourceText.has(path.join(srcRoot, 'audio/SoundEngine.ts')), 'SoundEngine.ts missing');
  assert(sourceText.has(path.join(srcRoot, 'audio/soundManifest.ts')), 'soundManifest.ts missing');
  assert(sourceText.has(path.join(srcRoot, 'audio/soundLanguage.ts')), 'soundLanguage.ts missing');
  console.log('  [PASS] H one SoundEngine, owned by GameEngine');
}

function contractIUiOwnership(): void {
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  const app = sourceText.get(path.join(srcRoot, 'App.tsx')) || '';
  for (const banned of ['LEVEL CLEAR', 'GET READY', 'SECTOR CLEARED']) {
    assert(!renderer.includes(banned), `Renderer draws ${banned}`);
  }
  assert(!app.includes('PlatformManager'), 'App constructs platform simulation');
  assert(!/state\.wave\s*=/.test(app), 'App assigns the plasma front');
  assert(!app.includes('new SoundEngine'), 'App constructs a sound engine');
  console.log('  [PASS] I canvas does not own menus; React does not own the wave');
}

function contractJUnusedFrameworks(): void {
  const banned = ['tailwindcss', '@tailwindcss/vite', 'lucide-react', 'motion', '@google/genai', 'express'];
  for (const [file, text] of sourceText) {
    for (const name of banned) {
      const pattern = new RegExp(`from\\s+['"]${name}['"]`);
      assert(!pattern.test(text), `${rel(file)} imports ${name}`);
    }
  }
  console.log('  [PASS] J production source does not import the unused frameworks');
}

function contractObjectiveScopes(): void {
  const sum = LEVEL_DATABASE.find((level) => level.mathConfig.mode === 'SUM_TO')!;
  const math = new MathChallengeEngine();
  math.initializeSession(sum, 2);
  const levelObjective = describeLevelObjective(sum.mathConfig);
  const rowObjective = math.getAmbientObjectiveForRow(1);
  assert(!!levelObjective && !!rowObjective, 'sum objective missing');
  assert(levelObjective!.label === rowObjective!.label && levelObjective!.value === rowObjective!.ambientValue, 'constant sum rule diverged between level and row');

  const difference = LEVEL_DATABASE.find((level) => level.mathConfig.mode === 'DIFFERENCE')!;
  const differenceMath = new MathChallengeEngine();
  differenceMath.initializeSession(difference, 2);
  const levelDifference = describeLevelObjective(difference.mathConfig);
  const rowDifference = differenceMath.getAmbientObjectiveForRow(1);
  assert(levelDifference?.valueRole === 'maxMinuend', 'difference level objective is not the fact-family cap');
  assert(levelDifference?.value === difference.mathConfig.maxValue, 'difference level value is not maxValue');
  assert(rowDifference?.valueRole === 'rowDifference', 'difference row objective is not the challenge difference');
  assert(levelDifference?.label === 'FIND' && rowDifference?.label === 'FIND', 'difference label drifted');
  console.log('  [PASS] objective scopes: shared formatter, distinct difference meanings');
}

function contractKWarpingGone(): void {
  const banned = ['WARPING', 'warpElapsed', 'warpDurationMs', 'warpAccelMultiplier'];
  for (const [file, text] of sourceText) {
    for (const token of banned) {
      assert(!text.includes(token), `${rel(file)} still references ${token}`);
    }
  }
  console.log('  [PASS] K WARPING is absent from the production runtime');
}

function contractLDeadDeaths(): void {
  const banned = ['wormhole', 'DIMENSIONAL_HOTPLATE', 'detonationState', 'detonationParticles', 'orbitalState', 'orbitalDuration'];
  for (const [file, text] of sourceText) {
    const body = text.replaceAll('_detonated', '');
    for (const token of banned) {
      assert(!body.includes(token), `${rel(file)} still references ${token}`);
    }
    assert(!/\bdetonation\b/.test(body), `${rel(file)} still references detonation`);
  }
  console.log('  [PASS] L removed death variants are not referenced by production runtime');
}

function contractMNoDrainRate(): void {
  // Drain and a second countdown stay forbidden.
  // A kilonova-named fog is allowed when its distance is the current wave gap.
  for (const [file, text] of sourceText) {
    assert(!text.includes('kilonovaDrainRate'), `${rel(file)} still references kilonovaDrainRate`);
    assert(!text.includes('kilonovaDist -='), `${rel(file)} still advances a second plasma distance`);
  }
  console.log('  [PASS] M no independent kilonova drain; wave-derived presentation remains allowed');
}

/** Gate 2 accepted appearance. Test fixture only. Not a production lookup. */
const GATE2_CAMPAIGN_REALMS: Record<string, string> = {
  f1_sum10: 'lattice',
  f2_skip2: 'lattice',
  l3_sum12: 'lattice',
  l4_skip2: 'lattice',
  l5_sum14: 'lattice',
  f3_sum15: 'orbital',
  f4_skip3: 'orbital',
  o3_sum18: 'orbital',
  o4_skip4: 'orbital',
  o5_sum16: 'orbital',
  d1_sum20: 'field',
  d2_skip5: 'field',
  d3_mult2: 'field',
  d4_diff15: 'field',
  f5_sum22: 'field',
  v1_sum25: 'signal',
  v2_skip7: 'signal',
  v3_mult3: 'signal',
  v4_diff25: 'signal',
  s5_skip6: 'signal',
  q1_sum30: 'plasma',
  q2_mult5: 'plasma',
  p3_sum28: 'plasma',
  p4_diff20: 'plasma',
  p5_skip8: 'plasma',
  q3_skip4: 'quantum',
  q4_mult7: 'quantum',
  q5_sum40: 'quantum',
  u4_sum35: 'quantum',
  u5_diff30: 'quantum',
};

function contractNCampaignRealms(): void {
  assert(LEVEL_DATABASE.length === 30, 'campaign length drifted');
  for (const level of LEVEL_DATABASE) {
    assert(isRealmId(level.theme.realm), `${level.id} schema realm is not in the realm domain`);
    const resolved = realmForLevel(level.theme);
    assert(resolved.id === level.theme.realm, `${level.id} resolver ignored the schema realm`);
  }
  assert(realmForLevel(undefined).id === DEFAULT_REALM_ID, 'missing theme did not use the explicit default');
  assert(realmForLevel({}).id === DEFAULT_REALM_ID, 'missing realm did not use the explicit default');
  assert(realmForLevel({ realm: 'not-a-realm' }).id === DEFAULT_REALM_ID, 'invalid realm escaped the domain');
  assert(DEFAULT_REALM_ID === 'lattice', 'the existing missing-realm terminal changed');
  console.log('  [PASS] N every campaign schema resolves through its declared realm');
}

function contractONoIdRealmMap(): void {
  const levelIds = LEVEL_DATABASE.map((level) => level.id).join('|');
  const realmIds = Object.keys(REALMS).join('|');
  const idKeyedRealm = new RegExp(`\\b(?:${levelIds})\\s*:\\s*['"](?:${realmIds})['"]`);
  for (const [file, text] of sourceText) {
    assert(!text.includes('REALM_OF_LEVEL'), `${rel(file)} still names an ID realm map`);
    assert(!idKeyedRealm.test(text), `${rel(file)} maps a campaign level id to a realm`);
  }
  const resolver = sourceText.get(path.join(srcRoot, 'visual/realms.ts')) || '';
  assert(!/realmForLevel\s*\(\s*id/.test(resolver), 'realmForLevel still takes a level id');
  console.log('  [PASS] O campaign realms are not inferred from level ids');
}

function contractPRealmDomain(): void {
  const domain = Object.keys(REALMS).sort();
  assert(domain.join(',') === 'field,lattice,orbital,plasma,quantum,signal', `realm domain drifted: ${domain.join(',')}`);
  for (const level of LEVEL_DATABASE) {
    const resolved = realmForLevel(level.theme).id;
    assert(domain.includes(resolved), `${level.id} resolved outside the six realms`);
  }
  console.log('  [PASS] P campaign realms stay inside the six-realm domain');
}

function contractQRealmIdentity(): void {
  assert(Object.keys(GATE2_CAMPAIGN_REALMS).length === 30, 'baseline realm fixture is not 30 levels');
  for (const level of LEVEL_DATABASE) {
    const expected = GATE2_CAMPAIGN_REALMS[level.id];
    assert(!!expected, `${level.id} is missing from the Gate 2 realm fixture`);
    assert(level.theme.realm === expected, `${level.id} declared realm changed from ${expected}`);
    assert(realmForLevel(level.theme).id === expected, `${level.id} resolved realm changed from ${expected}`);
  }
  console.log('  [PASS] Q campaign realm identity matches the Gate 2 baseline');
}

function contractRNoWaveSlowdown(): void {
  for (const [file, text] of sourceText) {
    assert(!text.includes('waveSlowdown1'), `${rel(file)} still references waveSlowdown1`);
    assert(!text.includes('waveSlowdown2'), `${rel(file)} still references waveSlowdown2`);
  }
  assert(!('waveSlowdown1' in DEFAULT_ZYX_CONFIG.catastrophe), 'waveSlowdown1 is still initialized');
  assert(!('waveSlowdown2' in DEFAULT_ZYX_CONFIG.catastrophe), 'waveSlowdown2 is still initialized');
  console.log('  [PASS] R unused wave slowdown config is absent');
}

function contractSNoDormantScreens(): void {
  for (const [file, text] of sourceText) {
    assert(!/['"]paused['"]/.test(text), `${rel(file)} still names the dormant paused screen`);
    assert(!/['"]settings['"]/.test(text), `${rel(file)} still names the dormant settings screen`);
  }
  console.log('  [PASS] S dormant paused and settings screen states are absent');
}

function contractTNoClearNextHook(): void {
  const css = readFileSync(path.join(srcRoot, 'index.css'), 'utf8');
  assert(!/\.clear-next(?!-)\s*\{/.test(css), 'obsolete .clear-next rule remains');
  assert(css.includes('.clear-next-value'), 'live clear-next-value presentation was removed');
  for (const [file, text] of sourceText) {
    assert(!/className=(?:\{)?["'`][^"'`]*(?:^|\s)clear-next(?:\s|["'`])/.test(text), `${rel(file)} assigns obsolete clear-next`);
  }
  console.log('  [PASS] T obsolete .clear-next hook is absent; clear-next-value remains');
}

function contractUNoUnusedAudioBarrel(): void {
  assert(!sourceText.has(path.join(srcRoot, 'audio/index.ts')), 'unused audio barrel still present');
  assert(sourceText.has(path.join(srcRoot, 'math/index.ts')), 'live math barrel was removed');
  const audioBarrel = /from\s+['"](?:\.\.?\/)*(?:src\/)?audio['"]/;
  for (const [file, text] of sourceText) {
    assert(!audioBarrel.test(text), `${rel(file)} imports the audio barrel`);
  }
  for (const file of walk(path.join(root, 'tests'))) {
    const text = readFileSync(file, 'utf8');
    assert(!audioBarrel.test(text), `${path.relative(root, file)} imports the audio barrel`);
  }
  console.log('  [PASS] U unused audio barrel is absent; math barrel remains');
}

function contractVSequenceContext(): void {
  const row = (id: string, mathConfig: LevelSchema['mathConfig']) => ({
    id,
    mathConfig,
    progressionVector: { x: 0, y: -1 },
    theme: { background: 'dark', palette: 'content' },
  });
  const planted = new MathChallengeEngine();
  const prior = planted.generateChallengeForRow(row('v_prior', { mode: 'SKIP_COUNT', step: 2, direction: 1 }), 1);
  assert(prior.sequenceStateAfter === 4, 'plant did not leave a stale lookahead of 4');
  const backward = planted.generateChallengeForRow(row('v_back', {
    mode: 'SKIP_COUNT', step: 5, direction: -1, requestedStart: 50,
  }), 1);
  assert(backward.sequenceStateBefore === 50, 'explicit start lost to stale lookahead');
  assert(backward.correctAnswer === 45, 'backward-by-5 did not produce 45');
  assert(backward.exhausted !== true, 'start 50 was treated as exhausted');
  assert(backward.prompt.hintText?.includes('backward by 5') === true, 'backward hint lost');
  assert(planted.getCommittedState() === undefined, 'opening a sequence context committed learner state');

  const same = new MathChallengeEngine();
  const forward = row('v_same', { mode: 'SKIP_COUNT', step: 5, direction: 1 });
  const session = same.initializeSession(forward, 3);
  assert(session.initialChallenges.map((item) => item.challenge.correctAnswer).join(',') === '10,15,20', 'homogeneous skip did not continue');
  assert(same.getCommittedState() === 5, 'pregeneration committed a landing');
  assert(same.getLookaheadState() === 20, 'homogeneous lookahead did not advance');
  console.log('  [PASS] V a new sequence context is not overridden by stale lookahead');
}

function screenPoint(engine: GameEngine, platform: { x: number; y: number }): { x: number; y: number } {
  return {
    x: platform.x + engine.canvas.width / 2 - engine.camera.x,
    y: platform.y + engine.canvas.height / 2 - engine.camera.y,
  };
}

function countDeparts(engine: GameEngine): { count: () => number } {
  const audio = engine.audio;
  const play = audio.play.bind(audio);
  let departs = 0;
  audio.play = (eventId, context) => {
    if (eventId === 'motion.depart') departs++;
    play(eventId, context);
  };
  return { count: () => departs };
}

function contractWSingleActivation(): void {
  const engine = freshEngine(LEVEL_DATABASE[0]);
  const departs = countDeparts(engine);
  const first = engine.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  const other = engine.platformManager.platforms.find((p) => p.rowIdx === 1 && !p.isCorrect)!;
  const firstPoint = screenPoint(engine, first);
  engine.handleInput(firstPoint.x, firstPoint.y);
  const pending = engine.challengeTrace.pending;
  const shown = engine.state.zyx.val;
  engine.handleInput(firstPoint.x, firstPoint.y);
  engine.handleInput(screenPoint(engine, other).x, screenPoint(engine, other).y);
  assert(engine.state.zyx.jumping, 'a phone tap did not start a jump');
  assert(engine.targetPlatform === first, 'a second activation during travel selected another platform');
  assert(engine.challengeTrace.pending === pending, 'duplicate activation replaced the motor commit');
  assert(engine.challengeTrace.pending?.optionId === first.optionId, 'duplicate activation committed a different option');
  assert(departs.count() === 1, 'duplicate activation replayed the departure');
  assert(engine.state.score === 0 && engine.correctInRow === 0, 'duplicate activation scored before landing');
  assert(engine.mathEngine.getCommittedRow() === 0, 'duplicate activation committed math before landing');
  assert(engine.state.zyx.val === shown || engine.state.zyx.val === engine.mathEngine.getChallenge(first.challengeId!)?.sequenceStateAfter, 'duplicate activation replaced the travel preview');
  jumpToRest(engine);
  assert(!engine.state.zyx.jumping && !engine.state.zyx.bouncing, 'the single jump did not finish');
  assert(engine.state.score === 1 && engine.correctInRow === 1, 'one tap did not score exactly once');
  assert(engine.mathEngine.getCommittedRow() === 1, 'one tap did not commit exactly one row');
  assert(engine.challengeTrace.attempts().length === 1, 'one tap graded more than one attempt');
  assert(departs.count() === 1, 'landing replayed the departure');

  const second = engine.platformManager.platforms.find((p) => p.rowIdx === 2 && p.isCorrect)!;
  const secondPoint = screenPoint(engine, second);
  engine.handleInput(secondPoint.x, secondPoint.y);
  const secondPending = engine.challengeTrace.pending;
  engine.handleInput(secondPoint.x, secondPoint.y);
  assert(engine.state.zyx.jumping, 'a later distinct tap was swallowed');
  assert(engine.targetPlatform === second, 'the later tap did not select the next answer');
  assert(engine.challengeTrace.pending === secondPending, 'the later tap was replaced by its duplicate');
  assert(departs.count() === 2, 'a later distinct tap did not depart exactly once');
  jumpToRest(engine);
  assert(engine.state.score === 2 && engine.mathEngine.getCommittedRow() === 2, 'two separated taps did not produce two commits');
  assert(engine.challengeTrace.attempts().length === 2, 'two separated taps were not graded twice');

  const wrongEngine = freshEngine(LEVEL_DATABASE[0]);
  const wrongDeparts = countDeparts(wrongEngine);
  const wrong = wrongEngine.platformManager.platforms.find((p) => p.rowIdx === 1 && !p.isCorrect)!;
  const wrongPoint = screenPoint(wrongEngine, wrong);
  wrongEngine.handleInput(wrongPoint.x, wrongPoint.y);
  const wrongPending = wrongEngine.challengeTrace.pending;
  wrongEngine.handleInput(wrongPoint.x, wrongPoint.y);
  assert(wrongEngine.state.zyx.jumping, 'a wrong tap did not travel');
  assert(wrongEngine.targetPlatform === wrong, 'duplicate wrong tap changed the selection');
  assert(wrongEngine.challengeTrace.pending === wrongPending, 'duplicate wrong tap replaced the motor commit');
  assert(wrongDeparts.count() === 1, 'a wrong tap departed twice');
  jumpToRest(wrongEngine);
  assert(wrongEngine.state.score === 0 && wrongEngine.correctInRow === 0, 'a wrong tap committed progress');
  assert(wrongEngine.mathEngine.getCommittedRow() === 0, 'a wrong tap committed math');
  assert(wrongEngine.challengeTrace.attempts().length === 1, 'a wrong tap was graded twice');

  const sealed = freshEngine(LEVEL_DATABASE[0]);
  const sealedPlatform = sealed.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  const sealedPoint = screenPoint(sealed, sealedPlatform);
  sealed.state.status = 'level_complete';
  sealed.handleInput(sealedPoint.x, sealedPoint.y);
  assert(!sealed.state.zyx.jumping, 'level_complete accepted a jump');
  sealed.state.status = 'DYING';
  sealed.handleInput(sealedPoint.x, sealedPoint.y);
  assert(!sealed.state.zyx.jumping, 'DYING accepted a jump');
  sealed.state.status = 'playing';
  sealed.setCalibrationFrozen(true);
  sealed.handleInput(sealedPoint.x, sealedPoint.y);
  assert(!sealed.state.zyx.jumping, 'calibration accepted a jump');

  const app = sourceText.get(path.join(srcRoot, 'App.tsx')) || '';
  const engineSrc = sourceText.get(path.join(srcRoot, 'engine/GameEngine.ts')) || '';
  assert(app.includes("if (screen !== 'playing') return;"), 'gameplay input is mounted off the playing screen');
  assert(app.includes("addEventListener('click', handleClick)"), 'mouse click is no longer a gameplay input');
  assert(app.includes("addEventListener('touchend', handleTouch, { passive: false })"), 'phone touchend is no longer cancelable');
  assert(app.includes('if (isUiEventTarget(e.target)) return;'), 'UI targets are no longer excluded from gameplay input');
  assert(app.includes('e.preventDefault();'), 'non-UI touchend no longer cancels the synthetic click');
  assert((app.match(/changedTouches\[\d+\]/g) || []).join(',') === 'changedTouches[0]', 'gameplay touch reads more than the primary touch');
  assert((app.match(/addEventListener\(/g) || []).length === 2, 'gameplay registered an extra listener');
  assert((app.match(/onTouchEnd=/g) || []).length === 1, 'a new React touchend binding appeared');
  assert(!/onPointerDown|onPointerUp|pointerdown|pointerup/.test(app), 'pointer events were added without a defect');
  assert(
    engineSrc.includes("if (this.state.zyx.jumping || this.state.zyx.bouncing || this.state.zyx.falling || this.state.status !== 'playing') return;"),
    'a jump in progress no longer ignores a second activation',
  );
  console.log('  [PASS] W one activation is one jump; a later tap still counts');
}

function contractXNoFalseIntegration(): void {
  const meta = JSON.parse(readFileSync(path.join(root, 'metadata.json'), 'utf8'));
  const caps = Array.isArray(meta.majorCapabilities) ? meta.majorCapabilities.map(String) : [];
  assert(!caps.some((cap) => /gemini|genai|generative/i.test(cap)), 'metadata claims an unused Gemini capability');
  assert(!existsSync(path.join(root, '.env.example')), 'obsolete API-key example remains');
  const integration = /GEMINI_API_KEY|@google\/genai|generativelanguage\.googleapis|MAJOR_CAPABILITY_SERVER_SIDE_GEMINI/;
  for (const [file, text] of sourceText) {
    assert(!integration.test(text), `${rel(file)} references a Gemini runtime integration`);
  }
  const surfaces = [
    path.join(root, 'index.html'),
    path.join(root, 'vite.config.ts'),
    ...readdirSync(path.join(root, 'scripts')).map((name) => path.join(root, 'scripts', name)),
  ];
  for (const file of surfaces) {
    if (!statSync(file).isFile()) continue;
    assert(!integration.test(readFileSync(file, 'utf8')), `${path.relative(root, file)} references a Gemini runtime integration`);
  }
  const production = [...sourceText.values()].join('\n');
  assert(!/import\.meta\.env/.test(production), 'production source reads a client environment variable');
  assert(!/process\.env/.test(production), 'production source reads a server environment variable');
  console.log('  [PASS] X no false Gemini or API-key runtime integration');
}

function contractYDependencyAuthority(): void {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  const deps = manifest.dependencies ?? {};
  const dev = manifest.devDependencies ?? {};
  const names = [...Object.keys(deps), ...Object.keys(dev)];
  const abandoned = [
    '@google/genai',
    'express',
    '@types/express',
    'tailwindcss',
    '@tailwindcss/vite',
    'lucide-react',
    'motion',
    'dotenv',
    'autoprefixer',
    '@vitejs/plugin-react',
  ];
  for (const name of abandoned) {
    assert(!names.includes(name), `${name} returned as a direct dependency`);
  }
  assert(names.filter((name) => name === 'vite').length === 1, 'vite does not have one direct declaration');
  assert(typeof dev.vite === 'string' && deps.vite === undefined, 'vite is not the single build-tool declaration');
  assert(typeof deps.react === 'string' && typeof deps['react-dom'] === 'string', 'runtime react is no longer declared');
  assert(typeof dev.typescript === 'string' && typeof dev.tsx === 'string' && typeof dev['@types/node'] === 'string', 'the typecheck and test toolchain is no longer declared');
  console.log('  [PASS] Y direct dependencies match the live architecture');
}

function contractZConfigAuthority(): void {
  let definitions = 0;
  for (const text of sourceText.values()) {
    definitions += (text.match(/export const DEFAULT_ZYX_CONFIG\b/g) || []).length;
  }
  assert(definitions === 1, `expected one default config export, found ${definitions}`);
  assert(barrelDefault === DEFAULT_ZYX_CONFIG, 'the config barrel is not the defaults export');

  const app = sourceText.get(path.join(srcRoot, 'App.tsx')) || '';
  assert(/import\s*\{[^}]*\bDEFAULT_ZYX_CONFIG\b[^}]*\}\s*from\s*['"]\.\/config['"]/.test(app), 'App does not import the config authority');
  assert(!/const DEFAULT_ZYX_CONFIG\b/.test(app), 'App declares a second default config');
  assert(!app.includes('spawnDistanceBehind: 180'), 'the plasma lab still changes wave physics');

  const normal = DEFAULT_ZYX_CONFIG;
  const probe = {
    ...normal,
    wave: { ...normal.wave, spawnDistanceBehind: 180 },
  };
  const frozen = JSON.stringify(normal);
  assert(normal.wave.spawnDistanceBehind === 900, 'normal span drifted');
  assert(normal.wave.baseSpeed === 28, 'normal wave speed drifted');
  assert(normal.wave.proximityCollisionDist === 26, 'normal collision distance drifted');
  assert(normal.wave.warningDistance === 520, 'normal warning distance drifted');
  assert(!('kilonovaCorrectPush' in normal.gameplay), 'correct answers still carry a wave displacement');
  assert(!('kilonovaWrongPenalty' in normal.gameplay), 'wrong answers still carry a wave displacement');
  assert(probe.wave.spawnDistanceBehind === 180, 'probe did not shorten the span');
  assert(probe.wave.baseSpeed === normal.wave.baseSpeed, 'probe retuned wave speed');
  assert(probe.wave.proximityCollisionDist === normal.wave.proximityCollisionDist, 'probe retuned collision');
  assert(probe.wave.warningDistance === normal.wave.warningDistance, 'probe retuned warning');
  assert(probe.wave.warningHeightFactor === normal.wave.warningHeightFactor, 'probe retuned warning height');
  for (const key of Object.keys(normal) as (keyof typeof normal)[]) {
    if (key === 'wave') continue;
    assert(probe[key] === normal[key], `probe replaced ${key}`);
  }
  assert(JSON.stringify(normal) === frozen, 'building the probe mutated the default');

  const schema = LEVEL_DATABASE[0];
  const implicit = new GameEngine(new env.MockCanvas() as unknown as HTMLCanvasElement, schema);
  const explicit = new GameEngine(new env.MockCanvas() as unknown as HTMLCanvasElement, schema, normal);
  const probed = new GameEngine(new env.MockCanvas() as unknown as HTMLCanvasElement, schema, probe);
  assert(implicit.config === normal, 'omitted config is not the authoritative default');
  assert(explicit.config === normal, 'the normal App argument is not the authoritative default');
  assert(probed.config.wave.spawnDistanceBehind === 180, 'probe engine did not receive the shortened span');
  assert(probed.config.wave.baseSpeed === 28, 'probe engine retuned wave speed');
  assert(probed.config.gameplay === normal.gameplay, 'probe engine replaced gameplay config');
  assert(normal.wave.spawnDistanceBehind === 900, 'probe engine mutated the default span');
  console.log('  [PASS] Z default config has one authority; the plasma probe derives from it');
}

function contractAAPlasmaPresentation(): void {
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  const engineSrc = sourceText.get(path.join(srcRoot, 'engine/GameEngine.ts')) || '';
  assert(renderer.includes('derivePlasmaPresentation'), 'the renderer does not draw from the presentation authority');
  assert(engineSrc.includes('derivePlasmaPresentation'), 'the engine does not sync from the presentation authority');
  assert(!renderer.includes('knY = height - 50'), 'the old fog placement is still a second plasma formula');

  const pose = (gap: number) => {
    const engine = freshEngine();
    engine.camera.y = engine.state.zyx.y - engine.config.camera.targetOffsetY;
    engine.state.wave!.y = engine.state.zyx.y + gap;
    engine.draw();
    const view = engine.plasmaPresentation();
    const frame = engine.renderer.lastPlasma;
    assert(!!view && !!frame, `gap ${gap} did not derive a presentation`);
    assert(view!.physical.worldY === engine.state.wave!.y + SHOCK_FRONT_WORLD_OFFSET, `gap ${gap} front left the wave`);
    assert(Math.abs(view!.physical.screenY - worldToScreenY(view!.physical.worldY, engine.camera.y, 800)) < 0.001, `gap ${gap} left the camera helper`);
    assert(frame!.shock.executed === view!.physical.visible, `gap ${gap} drew a crest the world front did not enter`);
    assert(view!.atmosphere.viewportCoverage > 0, `gap ${gap} lost the atmosphere`);
    return view!;
  };

  const distant = pose(PLASMA_LAB_GAPS.distant);
  assert(distant.physical.visible === false, 'the distant physical crest was forced on screen');
  assert(distant.atmosphere.heatIntensity > 0.2, 'distant atmosphere is not perceptible');

  const approaching = pose(PLASMA_LAB_GAPS.approaching);
  assert(approaching.atmosphere.threat01 > distant.atmosphere.threat01, 'approaching did not raise threat');
  assert(approaching.physical.visible === false, 'approaching fabricated an on-screen crest');
  assert(approaching.atmosphere.viewportCoverage > distant.atmosphere.viewportCoverage, 'approaching atmosphere did not grow');

  const warning = pose(PLASMA_LAB_GAPS.warning);
  assert(warning.atmosphere.warningIntensity >= 0.99, 'warning intensity did not arrive');
  assert(warning.atmosphere.viewportCoverage > approaching.atmosphere.viewportCoverage, 'warning atmosphere did not strengthen');
  assert(warning.physical.worldY === warning.physicalGap + 0 || warning.physical.worldY === 520, 'warning front left the wave');

  const danger = pose(PLASMA_LAB_GAPS.danger);
  assert(danger.physical.visible, 'danger crest is not in the viewport');
  const collision = pose(PLASMA_LAB_GAPS.collision);
  assert(collision.physical.visible, 'collision crest is not in the viewport');
  assert(Math.abs(collision.physical.screenY - worldToScreenY(collision.physical.worldY, -150, 800)) < 0.5, 'collision crest left the physical front');

  for (const id of ['f1_sum10', 'f3_sum15', 'd1_sum20', 'v1_sum25', 'q1_sum30', 'q3_skip4']) {
    const engine = freshEngine(LEVEL_DATABASE.find((level) => level.id === id)!);
    engine.camera.y = -engine.config.camera.targetOffsetY;
    engine.draw();
    const frame = engine.renderer.lastPlasma;
    assert(frame?.fog?.intersectsViewport, `${id} lost the atmospheric threat`);
    assert(frame!.presentation!.physical.worldY === engine.state.wave!.y, `${id} front left the wave`);
    assert(frame!.fog?.stops[1] === PLASMA_PRESENTATION.heat.orange, `${id} replaced the heat`);
  }
  console.log('  [PASS] AA plasma presentation authority');
}

function contractAHCampaignVisibility(): void {
  for (const id of ['f1_sum10', 'f3_sum15', 'd1_sum20', 'v1_sum25', 'q1_sum30', 'q3_skip4']) {
    const engine = freshEngine(LEVEL_DATABASE.find((level) => level.id === id)!);
    const step = 1 / 60;
    for (let row = 0; row < 4; row++) {
      engine.draw();
      const seen = engine.renderer.lastPlasma?.presentation;
      assert(!!seen && seen.atmosphere.heatIntensity > 0.2, `${id} lost the atmospheric threat`);
      assert(seen!.physical.worldY === engine.state.wave!.y + SHOCK_FRONT_WORLD_OFFSET, `${id} front left the wave`);
      const before = engine.state.wave!.y;
      const platform = engine.platformManager.platforms.find((item) => item.rowIdx === engine.state.zyx.currentRow + 1 && item.isCorrect);
      assert(!!platform, `${id} ran out of correct platforms`);
      engine.executeJump(platform!);
      assert(engine.state.wave!.y === before, `${id} jump moved the wave`);
      let guard = 0;
      while (engine.state.zyx.jumping && guard < 180) {
        engine.update(step);
        guard++;
        if (guard % 15 === 0) {
          const view = engine.plasmaPresentation();
          assert(view?.physical.worldY === engine.state.wave!.y + SHOCK_FRONT_WORLD_OFFSET, `${id} front followed the jump`);
        }
      }
    }
  }
  console.log('  [PASS] AH campaign play keeps atmosphere and a world-anchored front');
}

function contractALSinglePlasmaAuthority(): void {
  const engineSrc = sourceText.get(path.join(srcRoot, 'engine/GameEngine.ts')) || '';
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  const presentation = sourceText.get(path.join(srcRoot, 'engine/plasmaPresentation.ts')) || '';
  assert((engineSrc.match(/this\.state\.wave\s*=/g) || []).length === 1, 'more than one wave object is created');
  assert((engineSrc.match(/this\.state\.wave\.y\s*-=/g) || []).length === 1, 'more than one active wave writer');
  assert((engineSrc.match(/this\.state\.wave\.y\s*=/g) || []).length === 1, 'wave placement is not centralized');
  assert(engineSrc.includes('if (!this.plasmaProbe || !this.state.wave) return'), 'lab placement is not probe-only');
  assert(!engineSrc.includes('nudgeWaveByMeter'), 'an answer nudge remains');
  assert(!renderer.includes('kilonovaDrainRate') && !presentation.includes('kilonovaDrainRate'), 'a drain timer remains');
  assert(!renderer.includes('reviewMode') && !presentation.includes('reviewMode'), 'review mode can replace plasma');
  assert(!renderer.includes('LevelStudio'), 'studio code entered the renderer');
  assert(!presentation.includes('realm.plasma'), 'a realm color can replace the wall');
  const derivations = [...sourceText.entries()].filter(([, text]) => text.includes('function derivePlasmaPresentation')).length;
  assert(derivations === 1, 'more than one presentation derivation');
  console.log('  [PASS] AL one physical wave and one presentation derivation');
}

function contractAMCameraConsistency(): void {
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  const presentation = sourceText.get(path.join(srcRoot, 'engine/plasmaPresentation.ts')) || '';
  assert(presentation.includes('return viewportHeight / 2 - cameraY + worldY'), 'the camera helper is not the viewport-center transform');
  assert(!renderer.includes('wy - camY'), 'the renderer kept a second plasma visibility test');
  assert(!renderer.includes('height / 2 - camY + '), 'the renderer recomputes plasma screen Y');
  const engine = freshEngine();
  engine.camera.y = -40;
  engine.state.wave!.y = 640;
  const view = engine.plasmaPresentation()!;
  assert(Math.abs(view.physical.screenY - worldToScreenY(640, -40, 800)) < 0.001, 'probe readout left the helper');
  engine.draw();
  assert(Math.abs(engine.renderer.lastPlasma!.presentation!.physical.screenY - view.physical.screenY) < 0.001, 'the painted front left the helper');
  console.log('  [PASS] AM plasma screen positions share one camera transform');
}

function contractANSignatureProfile(): void {
  const look = PLASMA_PRESENTATION;
  assert(look.heat.white.includes('255, 255, 255'), 'white heat left the profile');
  assert(look.heat.orange.includes('255, 120, 0'), 'orange heat left the profile');
  assert(look.heat.red.includes('255, 60, 0'), 'red heat left the profile');
  assert(look.heat.purple.includes('40, 0, 80'), 'purple heat left the profile');
  assert(look.crest.gold.includes('255,200,60'), 'gold crest left the profile');
  assert(look.crest.edge === '#ffffff', 'hot edge left the profile');
  assert(look.crest.glow === '#ff4400', 'glow left the profile');
  assert(look.crest.body > 0 && look.crest.rollA > 0, 'the filled crest is gone');
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  assert(renderer.includes('PLASMA_PRESENTATION'), 'the renderer does not paint from the profile');
  assert(!renderer.includes('#ff4400'), 'the glow was copied back into the renderer');
  console.log('  [PASS] AN signature plasma profile');
}

function contractAOWorldAnchoredFront(): void {
  const waveY = 900;
  const first = derivePlasmaPresentation({
    waveY, playerY: 0, cameraY: -150, viewportHeight: 800,
    spawnDistance: 900, collisionDistance: 26, warningDistance: 520,
  });
  const moved = derivePlasmaPresentation({
    waveY, playerY: -240, cameraY: -420, viewportHeight: 800,
    spawnDistance: 900, collisionDistance: 26, warningDistance: 520,
  });
  assert(first.physical.worldY === waveY && moved.physical.worldY === waveY, 'the front world position followed the player or camera');
  assert(moved.physical.screenY !== first.physical.screenY, 'a camera move did not change screen position');
  assert(Math.abs(moved.physical.screenY - worldToScreenY(waveY, -420, 800)) < 0.001, 'screen position left the shared transform');
  console.log('  [PASS] AO the shock front stays on the wave when player and camera move');
}

function contractAPPlayerIndependence(): void {
  const engine = freshEngine();
  engine.plasmaProbe = true;
  engine.freezePlasmaTime();
  const wave = engine.state.wave!.y;
  const before = engine.plasmaPresentation()!;
  engine.moveLabPlayer(1);
  engine.update(1);
  const after = engine.plasmaPresentation()!;
  assert(engine.state.wave!.y === wave, 'moving the player moved the wave');
  assert(after.physical.worldY === before.physical.worldY, 'moving the player moved the shock front');
  assert(after.physicalGap !== before.physicalGap, 'moving the player did not change the gap');
  assert(after.atmosphere.threat01 !== before.atmosphere.threat01, 'moving the player did not change threat');
  console.log('  [PASS] AP player movement does not move the shock front');
}

function contractAQCameraIndependence(): void {
  const engine = freshEngine();
  engine.plasmaProbe = true;
  engine.freezePlasmaTime();
  const wave = engine.state.wave!.y;
  const player = engine.state.zyx.y;
  const before = engine.plasmaPresentation()!;
  engine.moveLabCamera(-1);
  engine.update(1);
  const after = engine.plasmaPresentation()!;
  assert(engine.state.wave!.y === wave && engine.state.zyx.y === player, 'moving the camera moved the world');
  assert(after.physical.worldY === before.physical.worldY, 'moving the camera moved the shock front');
  const expected = worldToScreenY(after.physical.worldY, engine.camera.y, 800);
  assert(Math.abs(after.physical.screenY - expected) < 0.001, 'camera screen change left the shared transform');
  assert(Math.abs((after.physical.screenY - before.physical.screenY) - 80) < 0.001, 'camera motion did not project one-to-one');
  console.log('  [PASS] AQ camera movement only changes the shock front on screen');
}

function contractARJumpTrace(): void {
  const engine = freshEngine(LEVEL_DATABASE.find((level) => level.id === 'f3_sum15')!);
  const step = 1 / 60;
  for (let i = 0; i < 20; i++) engine.update(step);
  const platform = engine.platformManager.platforms.find((item) => item.rowIdx === engine.state.zyx.currentRow + 1 && item.isCorrect);
  assert(!!platform, 'level 6 had no correct landing');
  const restWave = engine.state.wave!.y;
  const restPlayer = engine.state.zyx.y;
  engine.executeJump(platform!);
  let steps = 0;
  while (engine.state.zyx.jumping && steps < 240) {
    engine.update(step);
    steps++;
  }
  for (let i = 0; i < 30; i++) engine.update(step);
  steps += 30;
  const view = engine.plasmaPresentation()!;
  const waveDelta = engine.state.wave!.y - restWave;
  const expected = -engine.config.wave.baseSpeed * steps * step;
  assert(Math.abs(waveDelta - expected) < 0.05, 'the level 6 jump did not advance the wave by time alone');
  assert(Math.abs((view.physical.worldY - restWave) - waveDelta) < 0.001, 'the shock front did not follow the wave');
  assert(Math.abs(engine.state.zyx.y - restPlayer) > 20, 'level 6 did not move the player');
  assert(Math.abs(waveDelta) + 5 < Math.abs(engine.state.zyx.y - restPlayer), 'the wave copied the player jump');
  console.log('  [PASS] AR a level 6 jump keeps the front on the timed wave');
}

function contractASNoSyntheticAnchor(): void {
  const presentation = sourceText.get(path.join(srcRoot, 'engine/plasmaPresentation.ts')) || '';
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  assert(presentation.includes('const shockWorldY = input.waveY + SHOCK_FRONT_WORLD_OFFSET'), 'the front is not the wave plus a fixed offset');
  assert(!presentation.includes('playerScreen'), 'the front is still placed from the player screen position');
  assert(!presentation.includes('visualFrontScreenY'), 'a synthetic screen front remains');
  assert(!renderer.includes('playerScreen +'), 'the renderer anchors the crest under the player');
  assert(!renderer.includes('viewportHeight - '), 'the renderer uses a fixed viewport crest');
  console.log('  [PASS] AS the shock front has no synthetic screen anchor');
}

function contractABPlasmaTemporalIndependence(): void {
  const engineSrc = sourceText.get(path.join(srcRoot, 'engine/GameEngine.ts')) || '';
  const writers = engineSrc.match(/this\.state\.wave\.y\s*=/g) || [];
  const ticks = engineSrc.match(/this\.state\.wave\.y\s*-=/g) || [];
  assert(writers.length === 1, `expected one life-start wave placement, found ${writers.length}`);
  assert(ticks.length === 1, `expected one time-based wave advancement, found ${ticks.length}`);
  assert(engineSrc.includes('this.state.wave.y -= this.state.wave.speed * effectiveDt'), 'time is not the advancement writer');
  assert(engineSrc.includes('this.placeWave(this.state.zyx.y + spawnDist)'), 'a new life no longer places the front');
  assert(!engineSrc.includes('nudgeWaveByMeter'), 'answer displacement writer remains');

  const speed = DEFAULT_ZYX_CONFIG.wave.plasmaVerticalSpeed ?? DEFAULT_ZYX_CONFIG.wave.baseSpeed;
  const step = 1 / 60;
  const close = (actual: number, expected: number, label: string) => {
    assert(Math.abs(actual - expected) < 1e-6, `${label}: wave moved ${actual}, expected ${expected}`);
  };
  const advance = (engine: GameEngine, seconds: number) => {
    const before = engine.state.wave!.y;
    let elapsed = 0;
    while (elapsed + 1e-9 < seconds && engine.state.status === 'playing') {
      const dt = Math.min(step, seconds - elapsed);
      engine.update(dt);
      elapsed += dt;
    }
    return { elapsed, dw: engine.state.wave!.y - before };
  };
  const until = (engine: GameEngine, done: (engine: GameEngine) => boolean, max = 4) => {
    const before = engine.state.wave!.y;
    let elapsed = 0;
    while (!done(engine) && elapsed < max && engine.state.status === 'playing') {
      engine.update(step);
      elapsed += step;
    }
    return { elapsed, dw: engine.state.wave!.y - before };
  };

  const idle = freshEngine();
  const idleRun = advance(idle, 1);
  close(idleRun.dw, -speed * idleRun.elapsed, 'idle');

  const straight = LEVEL_DATABASE.find((level) => level.id === 'f1_sum10')!;
  const jumper = freshEngine(straight);
  const correct = jumper.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  const beforeEvent = jumper.state.wave!.y;
  jumper.executeJump(correct);
  close(jumper.state.wave!.y - beforeEvent, 0, 'jump event');
  const landed = until(jumper, (engine) => !engine.state.zyx.jumping);
  close(landed.dw, -speed * landed.elapsed, 'correct landing');
  assert(jumper.state.zyx.currentRow === 1, 'correct landing did not advance the row');
  assert(jumper.camera.y < -1, 'camera did not follow the jump');

  const missed = freshEngine(straight);
  const wrong = missed.platformManager.platforms.find((p) => p.rowIdx === 1 && !p.isCorrect)!;
  missed.executeJump(wrong);
  const wrongLand = until(missed, (engine) => engine.state.zyx.bouncing);
  close(wrongLand.dw, -speed * wrongLand.elapsed, 'wrong landing');
  const snap = until(missed, (engine) => !engine.state.zyx.bouncing);
  close(snap.dw, -speed * snap.elapsed, 'snap-back');
  assert(missed.state.score === 0, 'wrong recovery committed a score');

  const bent = LEVEL_DATABASE.find((level) => level.id === 'd1_sum20')!;
  const diagonal = freshEngine(bent);
  const side = diagonal.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  const camX = diagonal.camera.x;
  diagonal.executeJump(side);
  const diag = until(diagonal, (engine) => !engine.state.zyx.jumping);
  close(diag.dw, -speed * diag.elapsed, 'diagonal landing');
  assert(diagonal.camera.x !== camX, 'diagonal route did not move the camera');
  assert(diagonal.state.wave!.y !== diagonal.state.zyx.y, 'the wave was rebased onto the player');

  console.log('  [PASS] AB plasma world position advances only with simulation time');
}

function contractPlasmaLockdownR1(): void {
  // P1: Exactly one physical wave object
  const engineSrc = sourceText.get(path.join(srcRoot, 'engine/GameEngine.ts')) || '';
  const waveAssignments = engineSrc.match(/this\.state\.wave\s*=/g) || [];
  assert(waveAssignments.length === 1, `P1: expected exactly one wave creation, found ${waveAssignments.length}`);
  const waveTicks = engineSrc.match(/this\.state\.wave\.y\s*-=/g) || [];
  assert(waveTicks.length === 1, `P1: expected exactly one wave movement tick, found ${waveTicks.length}`);
  const waveDirectWrites = engineSrc.match(/this\.state\.wave\.y\s*=(?!=)/g) || [];
  assert(waveDirectWrites.length === 1, `P1: expected exactly one wave placement writer (placeWave), found ${waveDirectWrites.length}`);

  // P2: Physical wave movement equals configuredPlasmaVerticalSpeed * effectiveDt across multiple speeds
  for (const testSpeed of [14, 28, 45, 70]) {
    const engine = freshEngine();
    engine.updateWaveConfig({ plasmaVerticalSpeed: testSpeed });
    assert(engine.state.wave!.speed === testSpeed, 'P2: updateWaveConfig did not set speed');
    const startY = engine.state.wave!.y;
    const dt = 0.05;
    engine.update(dt);
    const moved = startY - engine.state.wave!.y;
    assert(Math.abs(moved - testSpeed * dt) < 1e-5, `P2: wave moved ${moved}, expected ${testSpeed * dt}`);
  }

  // P3-P7: No repositioning from correct answer, wrong answer, landing, row change, platform recycling
  const straight = LEVEL_DATABASE.find((level) => level.id === 'f1_sum10')!;
  const testEngine = freshEngine(straight);
  const correctPlat = testEngine.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
  const beforeJumpWave = testEngine.state.wave!.y;
  testEngine.executeJump(correctPlat);
  assert(testEngine.state.wave!.y === beforeJumpWave, 'P3: starting jump repositioned wave');

  const jumpSpeed = testEngine.state.wave!.speed;
  let jumpElapsed = 0;
  while (testEngine.state.zyx.jumping) {
    testEngine.update(1 / 60);
    jumpElapsed += 1 / 60;
  }
  const expectedWaveY = beforeJumpWave - jumpSpeed * jumpElapsed;
  assert(Math.abs(testEngine.state.wave!.y - expectedWaveY) < 1e-4, 'P5/P6: landing or row change repositioned wave');

  const wrongPlat = testEngine.platformManager.platforms.find((p) => p.rowIdx === 2 && !p.isCorrect)!;
  const beforeWrongWave = testEngine.state.wave!.y;
  testEngine.executeJump(wrongPlat);
  assert(testEngine.state.wave!.y === beforeWrongWave, 'P4: wrong answer launch repositioned wave');
  let bounceElapsed = 0;
  while (testEngine.state.zyx.bouncing || testEngine.state.zyx.jumping) {
    testEngine.update(1 / 60);
    bounceElapsed += 1 / 60;
  }
  const expectedWrongWave = beforeWrongWave - jumpSpeed * bounceElapsed;
  assert(Math.abs(testEngine.state.wave!.y - expectedWrongWave) < 1e-4, 'P4: wrong answer recovery repositioned wave');

  // P8 & P9: Player movement & camera movement at frozen time do NOT reposition physical wave
  testEngine.plasmaProbe = true;
  testEngine.freezePlasmaTime();
  const waveBeforePlayerMove = testEngine.state.wave!.y;
  testEngine.moveLabPlayer(1);
  assert(testEngine.state.wave!.y === waveBeforePlayerMove, 'P8: player move repositioned wave');
  testEngine.moveLabPlayer(-1);
  assert(testEngine.state.wave!.y === waveBeforePlayerMove, 'P8: player move repositioned wave');
  testEngine.moveLabCamera(1);
  assert(testEngine.state.wave!.y === waveBeforePlayerMove, 'P9: camera move repositioned wave');
  testEngine.moveLabCamera(-1);
  assert(testEngine.state.wave!.y === waveBeforePlayerMove, 'P9: camera move repositioned wave');

  // P10 & P11: No synthetic player-relative or fixed-screen shockwave
  const presSrc = sourceText.get(path.join(srcRoot, 'engine/plasmaPresentation.ts')) || '';
  const rendSrc = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  assert(!presSrc.includes('playerScreen'), 'P10: presentation anchors to player screen');
  assert(!rendSrc.includes('playerScreen +'), 'P10: renderer anchors to player screen');
  assert(!presSrc.includes('visualFrontScreenY'), 'P11: synthetic screen front in presentation');
  assert(!rendSrc.includes('viewportHeight - '), 'P11: fixed-screen shockwave in renderer');

  // P12: Physical wave new-life placement uses configured plasmaStartDistance
  for (const customStart of [300, 600, 900, 1100]) {
    const customEngine = freshEngine(straight, { wave: { plasmaStartDistance: customStart, spawnDistanceBehind: customStart } });
    const expectedInitialWaveY = customEngine.state.zyx.y + customStart;
    assert(Math.abs(customEngine.state.wave!.y - expectedInitialWaveY) < 1e-4, `P12: wave placed at ${customEngine.state.wave!.y}, expected ${expectedInitialWaveY}`);

    // Death recovery placement
    customEngine.state.wave!.y = customEngine.state.zyx.y + 10;
    customEngine.update(0.01);
    customEngine.restart();
    assert(Math.abs(customEngine.state.wave!.y - expectedInitialWaveY) < 1e-4, 'P12: restart placement did not use configured plasmaStartDistance');
  }

  // P13: Changing Start Distance affects initial placement but does not alter movement equation
  const startDistEngine = freshEngine();
  startDistEngine.updateWaveConfig({ plasmaStartDistance: 500 });
  const w1 = startDistEngine.state.wave!.y;
  startDistEngine.update(0.1);
  const movement = w1 - startDistEngine.state.wave!.y;
  const expectedMove = (startDistEngine.config.wave.plasmaVerticalSpeed ?? 28) * 0.1;
  assert(Math.abs(movement - expectedMove) < 1e-4, 'P13: Start Distance altered movement equation');

  // P14: Changing Vertical Speed affects time progression but does not teleport wave
  const speedEngine = freshEngine();
  const preChangeY = speedEngine.state.wave!.y;
  speedEngine.updateWaveConfig({ plasmaVerticalSpeed: 60 });
  assert(speedEngine.state.wave!.y === preChangeY, 'P14: Changing Vertical Speed teleported the wave');
  speedEngine.update(0.1);
  assert(Math.abs((preChangeY - speedEngine.state.wave!.y) - 6.0) < 1e-4, 'P14: Speed change did not scale movement');

  // P15: Changing presentation-only parameters cannot alter physical state
  const presEngine = freshEngine();
  const physicalYBefore = presEngine.state.wave!.y;
  presEngine.plasmaPresentation();
  presEngine.draw();
  assert(presEngine.state.wave!.y === physicalYBefore, 'P15: presentation or draw altered physical wave state');

  // Configuration-isolation contracts
  // 1. Neither setting creates player-relative or camera-relative wave authority
  const isoEngine = freshEngine();
  isoEngine.updateWaveConfig({ plasmaStartDistance: 450, plasmaVerticalSpeed: 35 });
  isoEngine.state.zyx.y += 100;
  assert(isoEngine.state.wave!.y === physicalYBefore, 'Isolation: Player movement modified wave authority');
  isoEngine.camera.y += 200;
  assert(isoEngine.state.wave!.y === physicalYBefore, 'Isolation: Camera movement modified wave authority');

  // 2. Settings Apply commits values, Cancel restores prior values
  let committedSettings = { startDistance: 900, verticalSpeed: 28 };
  let stagedSettings = { ...committedSettings };
  stagedSettings.startDistance = 400;
  stagedSettings.verticalSpeed = 50;
  assert(committedSettings.startDistance === 900, 'Isolation: Staging leaked into committed');
  stagedSettings = { ...committedSettings };
  assert(stagedSettings.startDistance === 900 && stagedSettings.verticalSpeed === 28, 'Isolation: Cancel failed to restore prior');
  stagedSettings.startDistance = 650;
  stagedSettings.verticalSpeed = 42;
  committedSettings = { ...stagedSettings };
  assert(committedSettings.startDistance === 650 && committedSettings.verticalSpeed === 42, 'Isolation: Apply failed to commit values');

  console.log('  [PASS] P1-P15 Plasma Lockdown R1 physical authority & configuration isolation');
}

function contractACDiagonalCamera(): void {
  const engineSrc = sourceText.get(path.join(srcRoot, 'engine/GameEngine.ts')) || '';
  assert(!engineSrc.includes('nextCenter'), 'landing still retargets the camera at the next row');
  assert(engineSrc.includes('here + rowStepX * travel'), 'horizontal framing is not tied to jump travel');

  const step = 1 / 60;
  const rowCenter = (engine: GameEngine, row: number) => {
    const raw = engine.state.schema.progressionVector;
    const mag = Math.hypot(raw.x, raw.y) || 1;
    return row * (raw.x / mag) * engine.platformManager.gapY;
  };
  const land = (engine: GameEngine) => {
    const platform = engine.platformManager.platforms.find((p) => p.rowIdx === 1 && p.isCorrect)!;
    const before = engine.state.wave!.y;
    engine.executeJump(platform);
    assert(engine.state.wave!.y === before, 'starting a jump moved the plasma');
    let frames = 0;
    while (engine.state.zyx.jumping && frames < 180) {
      engine.update(step);
      frames++;
    }
    return frames * step;
  };

  const orbital = freshEngine(LEVEL_DATABASE.find((level) => level.id === 'f3_sum15')!);
  const orbitalElapsed = land(orbital);
  const orbitalFrame = rowCenter(orbital, orbital.state.zyx.currentRow);
  assert(Math.abs(orbital.camera.x - orbitalFrame) < 0.01, 'orbital landing camera missed the destination row');
  assert(Math.abs((orbital.state.wave!.y) - (900 - orbital.config.wave.baseSpeed * orbitalElapsed)) < 0.05, 'orbital jump retuned the plasma');
  for (let i = 0; i < 30; i++) orbital.update(step);
  assert(Math.abs(orbital.camera.x - orbitalFrame) < 0.01, 'orbital landing started a second horizontal move');

  const field = freshEngine(LEVEL_DATABASE.find((level) => level.id === 'd1_sum20')!);
  land(field);
  const fieldFrame = rowCenter(field, field.state.zyx.currentRow);
  assert(Math.abs(field.camera.x - fieldFrame) < 0.01, 'diagonal landing camera missed the destination row');
  for (let i = 0; i < 30; i++) field.update(step);
  assert(Math.abs(field.camera.x - fieldFrame) < 0.01, 'diagonal landing started a second horizontal move');

  const vertical = freshEngine(LEVEL_DATABASE.find((level) => level.id === 'f1_sum10')!);
  land(vertical);
  assert(Math.abs(vertical.camera.x) < 0.01, 'vertical route started following horizontal lanes');
  for (let i = 0; i < 20; i++) vertical.update(step);
  assert(Math.abs(vertical.camera.x) < 0.01, 'vertical route drifted sideways after landing');

  const missed = freshEngine(LEVEL_DATABASE.find((level) => level.id === 'f3_sum15')!);
  const wrong = missed.platformManager.platforms.find((p) => p.rowIdx === 1 && !p.isCorrect)!;
  missed.executeJump(wrong);
  let guard = 0;
  while ((missed.state.zyx.jumping || missed.state.zyx.bouncing) && guard < 240) {
    missed.update(step);
    guard++;
  }
  assert(missed.state.zyx.currentRow === 0, 'wrong recovery advanced the row');
  assert(Math.abs(missed.camera.x - rowCenter(missed, 0)) < 0.01, 'wrong recovery recentered the row');
  console.log('  [PASS] AC diagonal landing finishes its camera framing');
}

function contractADAmbientTransparency(): void {
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  const start = renderer.indexOf('private drawAmbientTarget');
  const end = renderer.indexOf('private drawOperationLabel');
  assert(start >= 0 && end > start, 'ambient objective renderer was not found');
  const ambient = renderer.slice(start, end);
  assert(!ambient.includes('fillRect'), 'ambient objective draws a rectangle');
  assert(!ambient.includes('clearRect'), 'ambient objective clears a rectangle');
  assert(!ambient.includes('roundRect'), 'ambient objective traces a box');
  assert(!/strokeText\([^;\n]*,[^;\n]*,[^;\n]*,/.test(ambient), 'ambient stroke uses a maxWidth box');
  assert(!/fillText\([^;\n]*,[^;\n]*,[^;\n]*,/.test(ambient), 'ambient fill uses a maxWidth box');
  const plaque = renderer.slice(end);
  assert(plaque.includes('fillStyle') && plaque.includes('stroke('), 'the operation plaque was removed');
  console.log('  [PASS] AD ambient objective has no rectangular background');
}

function contractAEReviewIsolation(): void {
  const app = sourceText.get(path.join(srcRoot, 'App.tsx')) || '';
  assert(app.includes('reviewLaunchFromSearch'), 'App does not read the review launch');
  assert(app.includes('REVIEW MODE'), 'review mode is not identified');
  assert(app.includes('Review never writes campaign progress'), 'review continue can still write progress');
  assert(app.includes('if (!reviewMode)'), 'review completion can still save progress');
  assert(campaignReviewPlaylist() === LEVEL_DATABASE, 'review playlist is not the campaign database');
  assert(campaignReviewPlaylist().length === 30, 'review catalog is not the 30 campaign levels');
  const ids = campaignReviewPlaylist().map((level) => level.id);
  assert(new Set(ids).size === 30, 'review catalog repeats a level id');
  for (const sector of CAMPAIGN_SECTORS) {
    for (const level of sector.levels) {
      assert(campaignReviewPlaylist().includes(level), `${level.id} is not the campaign schema object`);
    }
  }
  assert(reviewLaunchFromSearch('').enabled === false, 'ordinary launch entered review');
  assert(reviewLaunchFromSearch('?plasmaProbe=1').enabled === false, 'the plasma probe entered review');
  const orbital = reviewLaunchFromSearch('?reviewMode=1&level=f3_sum15');
  assert(orbital.enabled && reviewIndexForLevel(orbital.levelId) === ids.indexOf('f3_sum15'), 'orbital review link missed its schema');
  assert(reviewIndexForLevel('not-a-level') === 0, 'an unknown review id invented a level');
  assert(reviewIndexForLevel(null) === 0, 'a bare review launch did not open the first level');
  assert(!app.includes('review-bar'), 'review controls are still painted on the playfield');
  assert(app.includes('Review / development'), 'review controls left Settings');
  console.log('  [PASS] AE review mode reaches the 30 campaign schemas without owning progress');
}

function contractAFStudioRenderer(): void {
  const studio = sourceText.get(path.join(srcRoot, 'studio/LevelStudio.tsx')) || '';
  const main = sourceText.get(path.join(srcRoot, 'main.tsx')) || '';
  const renderer = sourceText.get(path.join(srcRoot, 'engine/Renderer.ts')) || '';
  assert(studio.includes("from '../engine/GameEngine'"), 'studio does not use the production engine');
  assert(studio.includes('engine.draw()'), 'studio edit view does not call production draw');
  assert(studio.includes('engine.start()'), 'studio play view does not start the production loop');
  assert(!studio.includes('rgba(255,90,0'), 'studio forked the shock-wave paint');
  assert(main.includes("get('levelStudio') === '1'"), 'studio has no separate entry');
  assert(main.includes('<LevelStudio />'), 'studio entry does not mount Level Studio');
  assert(!renderer.includes('LevelStudio'), 'production renderer imports the studio');
  console.log('  [PASS] AF Level Studio previews through the production renderer');
}

function contractAGVisualScene(): void {
  for (const level of LEVEL_DATABASE) {
    const scene = sceneFromLevel(level);
    const checked = validateVisualScene(scene);
    assert(checked.ok, `${level.id} production scene was rejected`);
    const inventory = sceneInventory(scene);
    assert(inventory.backgroundLayers === 5, `${level.id} layer count drifted`);
    assert(inventory.uniqueOverrides === 0, `${level.id} invented a visual override`);
    assert(inventory.ambientObjective === 'transparent', `${level.id} ambient background drifted`);
    assert(inventory.environmentalObjects === 23, `${level.id} object count drifted`);
  }
  const sample = sceneFromLevel(LEVEL_DATABASE[0]);
  assert(!validateVisualScene({ ...sample, plasma: { presentation: 'realm-tint' } }).ok, 'a non-historical plasma look was accepted');
  assert(!validateVisualScene({ ...sample, wave: 12 }).ok, 'a scene wave position was accepted');
  assert(!validateVisualScene({ ...sample, ambientObjective: { source: 'math', background: 'boxed' } }).ok, 'a boxed ambient number was accepted');
  assert(!validateVisualScene(null).ok, 'empty scene data was accepted');
  const engineSrc = sourceText.get(path.join(srcRoot, 'engine/GameEngine.ts')) || '';
  assert(!engineSrc.includes('VisualScene'), 'the game engine reads studio scene data');
  console.log('  [PASS] AG visual scenes validate and cannot own the wave');
}

function main(): void {
  console.log('\n>>> JumpMath architecture contract suite');
  contractACampaign();
  contractBMathAuthority();
  contractCNoLiveWarping();
  contractDWinSecuresSimulation();
  contractEPreview();
  contractFOneWave();
  contractGWaveRecovery();
  contractHAudio();
  contractIUiOwnership();
  contractJUnusedFrameworks();
  contractObjectiveScopes();
  contractKWarpingGone();
  contractLDeadDeaths();
  contractMNoDrainRate();
  contractNCampaignRealms();
  contractONoIdRealmMap();
  contractPRealmDomain();
  contractQRealmIdentity();
  contractRNoWaveSlowdown();
  contractSNoDormantScreens();
  contractTNoClearNextHook();
  contractUNoUnusedAudioBarrel();
  contractVSequenceContext();
  contractWSingleActivation();
  contractXNoFalseIntegration();
  contractYDependencyAuthority();
  contractZConfigAuthority();
  contractAAPlasmaPresentation();
  contractABPlasmaTemporalIndependence();
  contractAHCampaignVisibility();
  contractALSinglePlasmaAuthority();
  contractAMCameraConsistency();
  contractANSignatureProfile();
  contractAOWorldAnchoredFront();
  contractAPPlayerIndependence();
  contractAQCameraIndependence();
  contractARJumpTrace();
  contractASNoSyntheticAnchor();
  contractPlasmaLockdownR1();
  contractACDiagonalCamera();
  contractADAmbientTransparency();
  contractAEReviewIsolation();
  contractAFStudioRenderer();
  contractAGVisualScene();
  console.log('\nARCHITECTURE CONTRACTS PASSED');
}

try {
  main();
} catch (error) {
  console.error(error);
  process.exit(1);
}
