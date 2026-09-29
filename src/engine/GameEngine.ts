import { GameState, LevelSchema, Platform } from '../types';
import { ZyxConfig, DEFAULT_ZYX_CONFIG, WaveConfig } from '../config';
import { PlatformManager } from './PlatformManager';
import { Camera } from './Camera';
import { Renderer } from './Renderer';
import { MorticianAPI } from './MorticianAPI';
import { SoundEngine } from '../audio/SoundEngine';
import { PersonaController } from './PersonaController';
import { LEVEL_DATABASE } from './LevelDatabase';
import { MathChallengeEngine } from '../math/MathChallengeEngine';
import { MathChallenge } from '../math/mathTypes';
import { ChallengeTrace, CommitmentSource } from '../evidence/challengeTrace';
import { derivePlasmaPresentation, PLASMA_LAB_GAPS, PlasmaLabState, PlasmaPresentation } from './plasmaPresentation';

export class GameEngine {
  config: ZyxConfig;
  state: GameState;
  platformManager: PlatformManager;
  camera: Camera;
  renderer: Renderer;
  mortician: MorticianAPI;
  audio: SoundEngine;
  persona: PersonaController;
  mathEngine: MathChallengeEngine;
  challengeTrace: ChallengeTrace;

  levelIndex = 0;
  correctInRow = 0;
  get WIN_CONDITION(): number {
    return this.config.gameplay.winCondition;
  }

  onLevelComplete?: () => void;
  /** Dev-only. Commercial play leaves this false. */
  plasmaProbe = false;
  /** Probe-only. Freezes simulation so player and camera can be moved alone. */
  plasmaFrozen = false;
  private plasmaStep = false;
  queuedThermal: number | null = null;
  lastThermal = -1;
  thermalLabel = '';
  heat = 0;
  /** Seconds after plasma recovery during which the existing front cannot advance. */
  plasmaShield = 0;
  /** 0 = reforming, 1 = fully present. */
  reformT = 1;
  private safePose = { x: 0, y: 0, row: 0, val: 0 };
  private heatEmit = 0;
  /** Value to restore if a correct jump dies before landing. Not a second math state. */
  private travelPreview: number | null = null;

  targetPlatform: Platform | null = null;
  particles: any[] = [];
  lastTime = performance.now();
  animationFrameId: number | null = null;
  loopInstanceId = 0;
  private calibrationFrozen = false;
  private completionPosted = false;

  setCalibrationFrozen(frozen: boolean) {
    this.calibrationFrozen = frozen;
    if (!frozen) this.lastTime = performance.now();
  }

  isCalibrationFrozen(): boolean {
    return this.calibrationFrozen;
  }

  start() {
    if (this.animationFrameId === null) {
      this.loopInstanceId++;
      console.log(`[GameEngine] start() called. Spawning loop instance ${this.loopInstanceId}`);
      this.lastTime = performance.now();
      this.animationFrameId = requestAnimationFrame(this.loop);
    }
  }

  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement, initialSchema?: LevelSchema, config: ZyxConfig = DEFAULT_ZYX_CONFIG, mathEngine?: MathChallengeEngine) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.config = config;
    const schema = initialSchema || LEVEL_DATABASE[0];
    this.state = {
      status: 'playing',
      score: 0,
      activeLevelId: schema.id,
      timeLeft: this.config.gameplay.turnTimeLimit,
      kilonovaDist: 100,
      flowState: false,
      combo: 0,
      hitstop: 0,
      impactFlash: 0,
      chromaSplit: 0,
      shake: 0,
      timeScale: 1.0,
      schema,
      zyx: {
        x: 0, y: 0, currentRow: 0, jumping: false,
        start: { x: 0, y: 0 }, target: { x: 0, y: 0 },
        t: 0, sx: 1, sy: 1, rot: 0, val: 0, mood: 'content', trail: [],
      },
    };
    this.platformManager = new PlatformManager(this.config.platform);
    this.camera = new Camera(this.config.camera);
    this.renderer = new Renderer(this.config);
    this.mortician = new MorticianAPI(this.config.catastrophe);
    this.audio = new SoundEngine();
    this.persona = new PersonaController();
    this.mathEngine = mathEngine || new MathChallengeEngine();
    this.challengeTrace = new ChallengeTrace();
    this.init();
  }

  init() {
    this.challengeTrace.reset();
    this.platformManager.reset();
    const session = this.mathEngine.initializeSession(this.state.schema, this.config.platform.initialSpawnRows);
    this.state.zyx.val = session.initialZyxVal;
    for (const item of session.initialChallenges) {
      this.platformManager.spawnRow(
        item.rowIdx,
        this.state.schema.progressionVector,
        item.challenge.options,
        item.challenge.id,
        item.challenge.sequenceStateAfter as number
      );
      this.noteSpawned(item.challenge, item.rowIdx, 'initial-burst');
    }
    this.state.timeLeft = this.config.gameplay.turnTimeLimit;
    this.initializePlasmaForNewLevel();
    this.captureSafePose();
  }

  handleInput(clientX: number, clientY: number) {
    if (this.calibrationFrozen) return;
    if (!this.audio.ctx || this.audio.ctx.state === 'suspended') {
      this.audio.init();
      this.audio.play('world.enter');
    }
    if (this.state.status !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = 500 / rect.width;
    const scaleY = 800 / rect.height;
    const lx = (clientX - rect.left) * scaleX;
    const ly = (clientY - rect.top) * scaleY;
    const worldX = lx - this.canvas.width / 2 + this.camera.x;
    const worldY = ly - this.canvas.height / 2 + this.camera.y;
    const clickedPlatform = this.platformManager.platforms.find(p => {
      return Math.abs(p.x - worldX) < p.width / 2 && Math.abs(p.y - worldY) < p.height / 2;
    });
    if (clickedPlatform) this.executeJump(clickedPlatform);
  }

  private hintActive(): boolean {
    const max = this.config.gameplay.turnTimeLimit;
    if (max <= 0) return false;
    return this.state.timeLeft / max <= this.config.gameplay.hintTimeRatio;
  }

  private placeWave(y: number): void {
    if (!this.state.wave) return;
    this.state.wave.y = y;
    this.state.wave.hit = false;
    this.state.wave.speed = this.config.wave.plasmaVerticalSpeed ?? this.config.wave.baseSpeed;
  }

  private syncPursuitPresentation(): void {
    const presentation = this.plasmaPresentation();
    if (!presentation) return;
    this.state.kilonovaDist = presentation.distance100;
  }

  plasmaPresentation(): PlasmaPresentation | null {
    if (!this.state.wave) return null;
    const spawnDist = this.config.wave.plasmaStartDistance ?? this.config.wave.spawnDistanceBehind;
    return derivePlasmaPresentation({
      waveY: this.state.wave.y,
      playerY: this.state.zyx.y,
      cameraY: this.camera.y,
      viewportHeight: this.canvas.height,
      spawnDistance: spawnDist,
      collisionDistance: this.config.wave.proximityCollisionDist,
      warningDistance: this.config.wave.warningDistance,
    });
  }

  /** Lab placement. Not a gameplay writer. Refused outside the probe. */
  inspectPlasma(stateOrGap: PlasmaLabState | number): void {
    if (!this.plasmaProbe || !this.state.wave) return;
    this.plasmaFrozen = true;
    const gap = typeof stateOrGap === 'number'
      ? stateOrGap
      : (PLASMA_LAB_GAPS[stateOrGap] ?? (this.config.wave.plasmaStartDistance ?? this.config.wave.spawnDistanceBehind));
    this.placeWave(this.state.zyx.y + gap);
    this.state.status = 'playing';
    this.syncPursuitPresentation();
  }

  playPlasmaPursuit(): void {
    if (!this.plasmaProbe) return;
    this.plasmaFrozen = false;
  }

  resetPlasmaLab(): void {
    if (!this.plasmaProbe) return;
    this.plasmaFrozen = true;
    this.state.zyx.y = 0;
    this.state.zyx.x = 0;
    this.camera.y = -this.config.camera.targetOffsetY;
    this.camera.x = 0;
    this.initializePlasmaForNewLevel();
  }

  testNewLevelEntrance(): void {
    if (!this.plasmaProbe) return;
    this.state.zyx.y = 0;
    this.state.zyx.x = 0;
    this.camera.y = -this.config.camera.targetOffsetY;
    this.camera.x = 0;
    this.initializePlasmaForNewLevel();
    this.plasmaFrozen = false;
    this.state.status = 'playing';
  }

  freezePlasmaTime(): void {
    if (!this.plasmaProbe) return;
    this.plasmaFrozen = true;
  }

  moveLabPlayer(direction: 1 | -1): void {
    if (!this.plasmaProbe) return;
    this.plasmaFrozen = true;
    this.state.zyx.y += direction * 80;
  }

  moveLabCamera(direction: 1 | -1): void {
    if (!this.plasmaProbe) return;
    this.plasmaFrozen = true;
    this.camera.y += direction * 80;
  }

  advancePlasmaTime(dt = 1 / 60): void {
    if (!this.plasmaProbe) return;
    this.plasmaStep = true;
    this.update(dt);
    this.plasmaStep = false;
  }

  updateWaveConfig(waveOverrides: Partial<WaveConfig>): void {
    this.config = {
      ...this.config,
      wave: {
        ...this.config.wave,
        ...waveOverrides,
      },
    };
    if (this.state.wave) {
      if (waveOverrides.plasmaVerticalSpeed !== undefined) {
        this.state.wave.speed = waveOverrides.plasmaVerticalSpeed;
      } else if (waveOverrides.baseSpeed !== undefined) {
        this.state.wave.speed = waveOverrides.baseSpeed;
      }
    }
  }

  calculateNewLevelEntranceY(): number {
    const delay = this.config.wave.plasmaEntranceDelaySeconds ?? 2.5;
    const speed = this.config.wave.plasmaVerticalSpeed ?? this.config.wave.baseSpeed;
    const viewportHeight = this.canvas?.height || 800;
    const initialCameraY = -this.config.camera.targetOffsetY;
    return (viewportHeight / 2) + initialCameraY + (speed * delay);
  }

  initializePlasmaForNewLevel(): void {
    const initialWaveY = this.calculateNewLevelEntranceY();
    const speed = this.config.wave.plasmaVerticalSpeed ?? this.config.wave.baseSpeed;
    if (!this.state.wave) {
      this.state.wave = {
        y: initialWaveY,
        speed,
        hit: false,
      };
    } else {
      this.placeWave(initialWaveY);
    }
    this.syncPursuitPresentation();
  }

  recoverPlasmaAfterPlayerDeath(): void {
    if (this.state.wave) {
      const spawnDist = this.config.wave.plasmaStartDistance ?? this.config.wave.spawnDistanceBehind;
      this.placeWave(this.state.zyx.y + spawnDist);
    }
    this.syncPursuitPresentation();
  }

  private waveGap(): number | null {
    if (!this.state.wave) return null;
    return this.state.wave.y - this.state.zyx.y;
  }

  private noteSpawned(challenge: MathChallenge, rowIdx: number, commitment: CommitmentSource): void {
    this.challengeTrace.noteSpawn({
      challengeId: challenge.id,
      rowIdx,
      modeId: String(challenge.modeId),
      requested: { ...this.state.schema.mathConfig },
      correctAnswer: challenge.correctAnswer,
      options: challenge.options.map((o) => ({
        id: o.id,
        value: o.value,
        isCorrect: o.isCorrect,
        errorModel: o.errorModel,
      })),
      commitment,
      attemptsBeforeGenerate: this.challengeTrace.attempts().length,
    });
  }

  executeJump(platform: Platform) {
    if (this.state.zyx.jumping || this.state.zyx.bouncing || this.state.zyx.falling || this.state.status !== 'playing') return;
    if (platform.rowIdx <= this.state.zyx.currentRow) return;
    this.persona.onJump(this.state.timeLeft);
    this.audio.play('motion.depart');
    this.targetPlatform = platform;
    this.challengeTrace.noteMotorCommit({
      challengeId: platform.challengeId ?? null,
      optionId: platform.optionId ?? null,
      rowIdx: platform.rowIdx,
      tapAtMs: typeof performance !== 'undefined' ? performance.now() : Date.now(),
      timeLeft: this.state.timeLeft,
      hintActive: this.hintActive(),
      waveGap: this.waveGap(),
    });
    this.state.zyx.jumping = true;
    this.state.zyx.start = { x: this.state.zyx.x, y: this.state.zyx.y };
    this.state.zyx.target = { x: platform.x, y: platform.y };
    this.state.zyx.t = 0;
    (this.state.zyx as any).prevX = this.state.zyx.x;
    (this.state.zyx as any).prevY = this.state.zyx.y;
    this.revealCommittedNextStep(platform);
  }

  /** Show the already-generated next operand during travel. Does not resolve or spawn. */
  private revealCommittedNextStep(platform: Platform) {
    this.restoreTravelPreview();
    if (!platform.challengeId || !platform.optionId) return;
    if (this.correctInRow + 1 >= this.WIN_CONDITION) return;
    const challenge = this.mathEngine.getChallenge(platform.challengeId);
    if (!challenge) return;
    const option = challenge.options.find((o) => o.id === platform.optionId);
    if (!option?.isCorrect) return;
    const next = challenge.sequenceStateAfter;
    if (typeof next !== 'number' || !Number.isFinite(next)) return;
    this.travelPreview = this.state.zyx.val;
    this.state.zyx.val = next;
  }

  private restoreTravelPreview() {
    if (this.travelPreview == null) return;
    this.state.zyx.val = this.travelPreview;
    this.travelPreview = null;
  }

  clearDeathStates() {
    const z = this.state.zyx;
    z.voidState = false;
    z.voidT = 0;
    z.voidAlpha = undefined;
    z.waveState = false;
    z.waveT = 0;
    z._detonated = false;
    z.bouncing = false;
    z.falling = false;
    this.state.hitstop = 0;
    this.state.impactFlash = 0;
    this.state.chromaSplit = 0;
    this.state.shake = 0;
    this.state.timeScale = 1.0;
    this.recoverPlasmaAfterPlayerDeath();
  }

  restart() {
    this.travelPreview = null;
    this.state.status = 'playing';
    this.state.score = 0;
    this.state.timeLeft = this.config.gameplay.turnTimeLimit;
    this.state.kilonovaDist = 100;
    this.state.combo = 0;
    this.correctInRow = 0;
    this.state.flowState = false;
    const z = this.state.zyx;
    z.currentRow = 0;
    z.x = 0;
    z.y = 0;
    z.jumping = false;
    z.t = 0;
    z.sx = 1;
    z.sy = 1;
    z.rot = 0;
    z.mood = 'content';
    z.trail = [];
    z.targetAngle = undefined;
    z.bark = undefined;
    this.platformManager = new PlatformManager(this.config.platform);
    this.challengeTrace.reset();
    const session = this.mathEngine.initializeSession(this.state.schema, this.config.platform.initialSpawnRows);
    z.val = session.initialZyxVal;
    for (const item of session.initialChallenges) {
      this.platformManager.spawnRow(
        item.rowIdx,
        this.state.schema.progressionVector,
        item.challenge.options,
        item.challenge.id,
        item.challenge.sequenceStateAfter as number
      );
      this.noteSpawned(item.challenge, item.rowIdx, 'initial-burst');
    }
    this.clearDeathStates();
    this.initializePlasmaForNewLevel();
    this.camera.x = 0;
    this.camera.y = 0;
    this.completionPosted = false;
    this.calibrationFrozen = false;
    this.persona.reset();
    this.audio.init();
    this.audio.play('ambience.bed');
    this.captureSafePose();
    this.reformT = 1;
    this.plasmaShield = 0;
    this.heat = 0;
  }

  respawn() {
    this.state.status = 'playing';
    this.state.timeLeft = this.config.gameplay.turnTimeLimit;
    this.state.combo = 0;
    this.correctInRow = 0;
    this.state.flowState = false;
    const safePlatform = this.platformManager.platforms.find(p => p.rowIdx === this.state.zyx.currentRow && p.isCorrect);
    if (safePlatform) {
      this.state.zyx.x = safePlatform.x;
      this.state.zyx.y = safePlatform.y;
    }
    const z = this.state.zyx;
    z.jumping = false;
    z.t = 0;
    z.sx = 1;
    z.sy = 1;
    z.rot = 0;
    z.mood = 'content';
    z.targetAngle = undefined;
    z.bark = undefined;
    this.persona.reset();
    this.clearDeathStates();
    this.platformManager.platforms.forEach(p => {
      if (p.rowIdx === this.state.zyx.currentRow + 1) {
        p.shattered = false;
        p.shards = [];
      }
    });
    this.audio.init();
    this.audio.play('ambience.bed');
  }

  private postLevelComplete() {
    if (this.completionPosted) return;
    this.completionPosted = true;
    this.state.status = 'level_complete';
    if (this.onLevelComplete) {
      this.onLevelComplete();
      return;
    }
    this.levelIndex = (this.levelIndex + 1) % LEVEL_DATABASE.length;
    this.loadSchema(LEVEL_DATABASE[this.levelIndex]);
  }

  queueThermalVariant(index: number) {
    this.queuedThermal = index;
  }

  private captureSafePose() {
    const committed = this.mathEngine.getCommittedState();
    this.safePose = {
      x: this.state.zyx.x,
      y: this.state.zyx.y,
      row: this.state.zyx.currentRow,
      val: typeof committed === 'number' ? committed : this.state.zyx.val,
    };
  }

  /** Plasma contact returns to the last committed landing. It does not open a new math session. */
  private recoverFromPlasma() {
    const pose = this.safePose;
    const z = this.state.zyx;
    z.x = pose.x;
    z.y = pose.y;
    z.currentRow = pose.row;
    z.val = pose.val;
    z.jumping = false;
    z.bouncing = false;
    z.falling = false;
    z.t = 0;
    z.sx = 1;
    z.sy = 1;
    z.rot = 0;
    z.mood = 'content';
    z.trail = [];
    z.targetAngle = undefined;
    z.bark = undefined;
    this.targetPlatform = null;
    this.travelPreview = null;
    this.state.combo = 0;
    this.state.flowState = false;
    this.state.timeLeft = this.config.gameplay.turnTimeLimit;
    this.state.status = 'playing';
    this.state.deathType = undefined;
    this.clearDeathStates();
    this.reformT = 0;
    this.plasmaShield = 1.25;
    this.heat = 0;
    this.mortician.deathComplete = false;
    this.mortician.type = '';
    const rawPv = this.state.schema.progressionVector;
    const mag = Math.hypot(rawPv.x, rawPv.y) || 1;
    const along = rawPv.x !== 0 ? (z.currentRow + 1) * (rawPv.x / mag) * this.platformManager.gapY : 0;
    this.camera.x = rawPv.x !== 0 ? 0.3 * z.x + 0.7 * along : 0;
    this.camera.y = z.y - this.config.camera.targetOffsetY;
  }

  loadSchema(schema: LevelSchema) {
    this.state.schema = schema;
    this.state.activeLevelId = schema.id;
    this.restart();
  }

  triggerDeath(type: 'wave' | 'void', cause?: 'wave' | 'timer') {
    if (this.state.status === 'DYING') return;
    this.restoreTravelPreview();
    const failureClass = cause ?? (type === 'wave' ? 'wave' : undefined);
    if (failureClass === 'wave' || failureClass === 'timer') {
      const pending = this.challengeTrace.pending;
      this.challengeTrace.noteSurvival({
        failureClass,
        deathType: String(type),
        pendingChallengeId: pending?.challengeId ?? null,
        pendingOptionId: pending?.optionId ?? null,
        waveGap: this.waveGap(),
        timeLeft: this.state.timeLeft,
      });
    }
    this.state.status = 'DYING';
    this.state.deathType = type;
    this.state.zyx.mood = 'danger';
    this.state.combo = 0;
    this.state.flowState = false;
    this.audio.stopAll();
    this.mortician.init(type, this);
    this.audio.play('state.death', { deathType: failureClass === 'timer' ? 'timer' : 'wave' });
  }

  fireImpact(hitstop: number, flash: number, chroma: number, shake: number) {
    this.state.hitstop = hitstop;
    this.state.impactFlash = flash;
    this.state.chromaSplit = chroma;
    this.state.shake = shake;
    this.state.timeScale = 1.0;
  }

  update(dt: number) {
    if (this.calibrationFrozen) return;
    if (this.plasmaFrozen && !this.plasmaStep) return;
    const stepOnly = this.plasmaStep;
    const effectiveDt = dt * (this.state.timeScale !== undefined ? this.state.timeScale : 1.0);
    if (!stepOnly && this.state.hitstop > 0) {
      this.state.hitstop--;
      return;
    }
    if (!stepOnly && this.state.impactFlash > 0) this.state.impactFlash--;
    if (!stepOnly && this.state.chromaSplit > 0) this.state.chromaSplit = Math.max(0, this.state.chromaSplit - this.config.camera.chromaSplitDecay);
    if (!stepOnly && this.state.shake > 0) this.state.shake *= this.config.camera.shakeDecay;

    if (this.plasmaShield > 0) {
      this.plasmaShield = Math.max(0, this.plasmaShield - dt);
    } else if (this.state.wave && !this.state.wave.hit && this.state.status === 'playing') {
      this.state.wave.y -= this.state.wave.speed * effectiveDt;
      if (this.state.wave.y <= this.state.zyx.y + this.config.wave.proximityCollisionDist) {
        this.state.wave.hit = true;
        this.syncPursuitPresentation();
        this.triggerDeath('wave', 'wave');
      } else {
        this.syncPursuitPresentation();
      }
    }
    if (stepOnly) return;

    if (this.state.status === 'playing') {
      if (this.reformT < 1) this.reformT = Math.min(1, this.reformT + dt / 0.55);
      this.state.timeLeft -= effectiveDt;
      const zyx = this.state.zyx;
      if (this.state.combo >= this.config.flow.comboThreshold && this.state.timeLeft > this.config.flow.minTimeLeft) {
        this.state.flowState = true;
      } else if (this.state.timeLeft <= this.config.flow.minTimeLeft) {
        this.state.flowState = false;
      }
      const maxTime = this.config.gameplay.turnTimeLimit;
      const pct = this.state.timeLeft / maxTime;
      if (pct <= this.config.gameplay.hintTimeRatio) {
        const targetPlatform = this.platformManager.platforms.filter(p => p.rowIdx === zyx.currentRow + 1).find(p => p.isCorrect);
        if (targetPlatform) zyx.targetAngle = Math.atan2(targetPlatform.y - zyx.y, targetPlatform.x - zyx.x);
      } else {
        zyx.targetAngle = undefined;
      }
      this.persona.update(dt, this);
      zyx.bark = this.persona.activeBark ? this.persona.activeBark.text : undefined;
      if (this.persona.overrideMood) zyx.mood = this.persona.overrideMood.mood;
      else if (pct <= this.config.gameplay.moodCriticalRatio) zyx.mood = 'critical';
      else if (pct <= this.config.gameplay.moodDangerRatio) zyx.mood = 'danger';
      else zyx.mood = 'content';

      const gap = this.waveGap();
      const contact = this.config.wave.proximityCollisionDist;
      const heatWindow = this.config.wave.baseSpeed * 0.6;
      if (gap != null && this.plasmaShield <= 0) {
        const remain = gap - contact;
        this.heat = remain <= 0 ? 1 : remain >= heatWindow ? 0 : 1 - remain / heatWindow;
      } else {
        this.heat = 0;
      }
      if (this.heat > 0.35) {
        this.heatEmit -= dt;
        if (this.heatEmit <= 0) {
          this.heatEmit = 0.08;
          this.particles.push({
            x: zyx.x + (Math.random() - 0.5) * 24,
            y: zyx.y - 8,
            vx: (Math.random() - 0.5) * 30,
            vy: 40 + Math.random() * 40,
            life: 0.28,
            color: '#ffb45a',
            sz: 2,
          });
        }
      }
      const waveWarning = gap !== null && gap < this.config.wave.warningDistance;
      this.audio.update(dt, { waveWarning });
      if (this.state.timeLeft <= 0) {
        this.state.timeLeft = 0;
        this.triggerDeath('void', 'timer');
        return;
      }

      let logicalY = zyx.y;
      if (zyx.jumping || this.state.flowState) {
        zyx.trail.push({ x: zyx.x, y: zyx.y, life: 1.0, isFlow: this.state.flowState });
      }
      zyx.trail.forEach(t => { t.life -= dt * (this.state.flowState ? this.config.player.trailDecayFlow : this.config.player.trailDecayNormal); });
      zyx.trail = zyx.trail.filter(t => t.life > 0);

      if (zyx.jumping) {
        zyx.t += dt * this.config.jump.jumpSpeed;
        let arcT: number;
        const kf1 = this.config.jump.arcKeyframe1;
        const kf2 = this.config.jump.arcKeyframe2;
        if (zyx.t < kf1) arcT = (zyx.t / kf1) * 0.5;
        else if (zyx.t < kf2) arcT = 0.5;
        else arcT = 0.5 + ((zyx.t - kf2) / (1.0 - kf2)) * 0.5;
        zyx.sy = 1 + Math.sin(arcT * Math.PI) * this.config.jump.squashY;
        zyx.sx = 1 - Math.sin(arcT * Math.PI) * this.config.jump.stretchX;
        if (zyx.t >= 1) {
          zyx.t = 1;
          zyx.jumping = false;
          zyx.x = zyx.target.x;
          zyx.y = zyx.target.y;
          this.handleLanding();
          logicalY = zyx.y;
          zyx.sx = 1;
          zyx.sy = 1;
        } else {
          zyx.x = zyx.start.x + (zyx.target.x - zyx.start.x) * zyx.t;
          logicalY = zyx.start.y + (zyx.target.y - zyx.start.y) * zyx.t;
          zyx.y = logicalY - Math.sin(arcT * Math.PI) * this.config.jump.apexHeight;
        }
      } else if (zyx.bouncing) {
        const g = zyx as any;
        if (g.bounceHold > 0) {
          g.bounceHold--;
          logicalY = zyx.start.y;
        } else {
          g.bounceT += dt / this.config.jump.bounceDuration;
          if (g.bounceT >= 1) {
            zyx.bouncing = false;
            g.bounceT = 0;
            zyx.x = zyx.target.x;
            zyx.y = zyx.target.y;
            zyx.sy = this.config.jump.bounceLandSy;
            zyx.sx = this.config.jump.bounceLandSx;
            zyx.rot = 0;
            this.state.timeLeft = this.config.gameplay.turnTimeLimit;
            logicalY = zyx.y;
          } else {
            const t = g.bounceT;
            const ax = Math.sin(t * Math.PI);
            zyx.x = zyx.start.x + (zyx.target.x - zyx.start.x) * t;
            logicalY = zyx.start.y + (zyx.target.y - zyx.start.y) * t;
            zyx.y = logicalY - ax * this.config.jump.bounceApexHeight;
            zyx.rot = Math.sin(t * Math.PI * 2) * this.config.jump.bounceRotAmplitude;
            zyx.sy = 1 + ax * this.config.jump.bounceSquashY;
            zyx.sx = 1 - ax * this.config.jump.bounceStretchX;
          }
        }
      }

      const rawPv = this.state.schema.progressionVector;
      const mag = Math.hypot(rawPv.x, rawPv.y) || 1;
      const pv = { x: rawPv.x / mag, y: rawPv.y / mag };
      // Y keeps its follow. X on a sideways route moves from this row's center
      // to the destination row's center during the jump, then stays there.
      // Landing must not aim at the row after the one just reached.
      this.camera.update(dt, 0, logicalY);
      if (pv.x !== 0) {
        const rowStepX = pv.x * this.platformManager.gapY;
        const z = this.state.zyx;
        const here = z.currentRow * rowStepX;
        if (z.jumping) {
          const travel = Math.min(1, Math.max(0, z.t));
          this.camera.x = here + rowStepX * travel;
        } else {
          this.camera.x = here;
        }
      }
      if (this.platformManager.platforms.length > this.config.gameplay.platformPruneThreshold) {
        const minKeepRow = zyx.currentRow - this.config.gameplay.platformPruneRowsBehind;
        this.platformManager.platforms = this.platformManager.platforms.filter(p => p.rowIdx >= minKeepRow);
        this.mathEngine.pruneChallengesBeforeRow(minKeepRow);
      }
      this.updateParticles(dt);
    } else if (this.state.status === 'DYING') {
      this.mortician.update(dt, this);
      this.updateParticles(dt);
      if (this.targetPlatform?.shattered && this.targetPlatform.shards) {
        this.targetPlatform.shards.forEach(sh => {
          sh.x += sh.vx * dt;
          sh.y += sh.vy * dt;
          sh.vy += this.config.catastrophe.shardGravity * dt;
          sh.rot += sh.vrot * dt;
        });
      }
      if (this.mortician.deathComplete) {
        if (this.state.deathType === 'wave') this.recoverFromPlasma();
        else this.respawn();
      }
    } else if (this.state.status === 'level_complete') {
      // React owns the clear card. The world stays frozen.
    }
  }

  updateParticles(dt: number) {
    this.particles.forEach(pt => {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vy += this.config.player.particleGravity * dt;
      pt.life -= dt * this.config.player.particleLifeDecay;
    });
    this.particles = this.particles.filter(pt => pt.life > 0);
    this.platformManager.platforms.forEach(p => {
      if (p.impactTimer !== undefined && p.impactTimer > 0) p.impactTimer -= dt;
    });
  }

  handleLanding() {
    if (!this.targetPlatform) return;
    let isCorrect = this.targetPlatform.isCorrect;
    const nextZyxVal = this.targetPlatform.nextZyxVal;
    const pending = this.challengeTrace.pending;
    const hintActive = pending?.hintActive ?? this.hintActive();
    const tapAtMs = pending?.tapAtMs ?? null;
    const gapAtTap = pending?.waveGap ?? this.waveGap();
    const timeLeftAtTap = pending?.timeLeft ?? this.state.timeLeft;
    if (this.targetPlatform.challengeId && this.targetPlatform.optionId) {
      const result = this.mathEngine.resolveAnswer(this.targetPlatform.challengeId, this.targetPlatform.optionId);
      isCorrect = result.correct;
      this.challengeTrace.noteAttempt({
        challengeId: this.targetPlatform.challengeId,
        rowIdx: this.targetPlatform.rowIdx,
        optionId: this.targetPlatform.optionId,
        correct: result.correct,
        failureClass: result.correct ? 'none' : 'math',
        hintActive,
        timeLeft: timeLeftAtTap,
        waveGap: gapAtTap,
        tapAtMs,
        alreadyResolved: !!result.alreadyResolved,
      });
    }
    if (isCorrect) {
      this.travelPreview = null;
      this.state.zyx.currentRow = this.targetPlatform.rowIdx;
      this.state.score++;
      this.state.combo++;
      this.correctInRow++;
      const isPerfect = this.state.timeLeft > this.config.flow.minTimeLeft;
      const timeLeftRatio = this.state.timeLeft / this.config.gameplay.turnTimeLimit;
      this.persona.onLand(true, isPerfect, this.state.combo);
      this.audio.notifyCorrect({ timeLeftRatio });
      this.audio.play(isPerfect || timeLeftRatio > 0.55 ? 'math.resolve.fluent' : 'math.resolve', {
        fluent: isPerfect,
        momentum: this.audio.getMomentum(),
      });
      this.targetPlatform.impactTimer = this.config.platform.impactDuration;
      for (let i = 0; i < this.config.platform.impactParticleCount; i++) {
        this.particles.push({
          x: this.targetPlatform.x + (Math.random() - 0.5) * 80,
          y: this.targetPlatform.y - 10,
          vx: (Math.random() - 0.5) * 200,
          vy: Math.random() * -150 - 50,
          life: 0.5,
          color: '#00ffff',
          sz: Math.random() * 4 + 2,
        });
      }
      if (this.correctInRow >= this.WIN_CONDITION) {
        this.audio.play('progress.level_clear', { momentum: this.audio.getMomentum() });
        this.postLevelComplete();
        return;
      }
      this.state.timeLeft = this.config.gameplay.turnTimeLimit;
      const committed = this.mathEngine.getCommittedState();
      if (typeof committed === 'number') this.state.zyx.val = committed;
      else if (nextZyxVal !== undefined) this.state.zyx.val = nextZyxVal;
      const nextRowIdx = this.platformManager.rowCursor;
      const nextChallenge = this.mathEngine.generateChallengeForRow(this.state.schema, nextRowIdx);
      this.platformManager.spawnRow(
        nextRowIdx,
        this.state.schema.progressionVector,
        nextChallenge.options,
        nextChallenge.id,
        nextChallenge.sequenceStateAfter as number
      );
      this.noteSpawned(nextChallenge, nextRowIdx, 'after-resolve');
      this.captureSafePose();
    } else {
      this.restoreTravelPreview();
      this.state.combo = 0;
      this.state.flowState = false;
      this.audio.notifyWrong();
      this.audio.play('math.nonresolve', { momentum: this.audio.getMomentum() });
      const g = this.state.zyx as any;
      g.bouncing = true;
      g.bounceT = 0;
      g.bounceHold = this.config.jump.bounceHoldFrames;
      g.start = { x: g.x, y: g.y };
      const backX = g.prevX !== undefined ? g.prevX : this.canvas.width / 2;
      const backY = g.prevY !== undefined ? g.prevY : 720;
      g.target = { x: backX, y: backY - 15 };
    }
  }

  draw() {
    this.renderer.draw(this.ctx, this, this.canvas.width, this.canvas.height);
  }

  loop = (time: number) => {
    if (this.animationFrameId === null) {
      console.warn(`[GameEngine] Orphaned loop instance detected and prevented!`);
      return;
    }
    const dt = Math.min((time - this.lastTime) / 1000, this.config.gameplay.maxDeltaTime);
    this.lastTime = time;
    this.update(dt);
    this.draw();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  cleanup() {
    console.log(`[GameEngine] cleanup() called. Terminating loop instance ${this.loopInstanceId}`);
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}
