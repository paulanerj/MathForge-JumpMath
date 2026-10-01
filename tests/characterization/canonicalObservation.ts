/**
 * CANONICAL OBSERVATION SCHEMA
 *
 * Defines machine-readable, domain-semantic observations of JumpMath simulation state.
 * Decoupled from internal private fields of any specific engine implementation.
 */

export interface CanonicalPlatformObservation {
  id: string;
  rowIdx: number;
  val: number;
  isCorrect: boolean;
  shattered: boolean;
  worldX: number;
  worldY: number;
}

export interface CanonicalDomainEvent {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
}

export interface CanonicalObservation {
  scenarioId: string;
  stepIndex: number;
  label: string;
  session: {
    status: 'ready' | 'playing' | 'bouncing' | 'dying' | 'gameover' | 'levelclear' | 'paused';
    score: number;
    streak: number;
    timeLeft: number;
    levelIndex: number;
    levelId: string;
  };
  player: {
    currentRow: number;
    x: number;
    y: number;
    jumping: boolean;
    bouncing: boolean;
    falling: boolean;
  };
  camera: {
    x: number;
    y: number;
  };
  plasma: {
    waveY: number;
    speed: number;
    gapToPlayer: number;
    shieldActive: boolean;
  };
  activeChallenge?: {
    id: string;
    prompt: string;
    correctAnswer: number;
    optionCount: number;
  };
  actionableRowPlatforms: CanonicalPlatformObservation[];
  framing: {
    isFramedCorrectly: boolean;
    nextRowMinX: number;
    nextRowMaxX: number;
  };
  safePose?: {
    x: number;
    y: number;
    row: number;
    val: number;
  } | null;
  travelPreview?: number | null;
  recoveryState?: {
    isRecovering: boolean;
    shieldRemaining: number;
    deathType?: string;
  };
  timerState?: {
    timeLeft: number;
    isExpired: boolean;
  };
  pendingTransition?: string | null;
  domainEvents: CanonicalDomainEvent[];
}

export interface GoldenScenarioTrace {
  schemaVersion: '1.0.0';
  baselineId: string;
  scenarioId: string;
  levelId: string;
  seed: number;
  viewport: { width: number; height: number; dpr: number };
  initialSettings?: Record<string, unknown>;
  observations: CanonicalObservation[];
  finalOutcome: 'WIN' | 'DEATH' | 'COMPLETED' | 'READY';
}
