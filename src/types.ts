import { MathErrorModel } from './math/mathTypes';

export interface Vector2D {
  x: number;
  y: number;
}

export interface LevelSchema {
  id: string;
  mathConfig: {
    mode: 'SUM_TO' | 'SKIP_COUNT' | 'MULTIPLY' | 'DIFFERENCE' | string;
    target?: number;
    step?: number;
    direction?: 1 | -1;
    factor?: number;
    minMultiplier?: number;
    maxMultiplier?: number;
    maxValue?: number;
    minValue?: number;
    [key: string]: unknown;
  };
  progressionVector: Vector2D;
  theme: {
    background: string;
    skyColors?: { top: string; mid: string; base: string; };
    palette: string;
    realm?: string;
    platform?: string;
    crest?: string;
    structure?: string;
    accent?: string;
    plasma?: string;
  };
}

export interface EntityState {
  x: number;
  y: number;
  currentRow: number;
  
  jumping: boolean;
  bouncing?: boolean;
  falling?: boolean;
  
  start: Vector2D;
  target: Vector2D;
  t: number; 
  
  sx: number;
  sy: number;
  rot: number;
  
  val: number;
  mood: string;
  trail: { x: number; y: number; life: number; isFlow: boolean; a?: number }[];
  targetAngle?: number;
  antennaAngle?: number;
  bark?: string;
  idleAnim?: any;
  
  // Death flags
  voidState?: boolean;
  voidT?: number;
  voidAlpha?: number;
  
  waveState?: boolean;
  waveT?: number;

  _detonated?: boolean;
}

export interface GameState {
  status: 'playing' | 'DYING' | 'level_complete';
  deathType?: 'wave' | 'void';
  flowState: boolean;
  combo: number;
  timeLeft: number;
  score: number;
  
  kilonovaDist: number; // Will be deprecated by wave, but keep for compatibility for now
  wave?: { y: number; speed: number; hit: boolean };
  
  hitstop: number;
  impactFlash: number;
  chromaSplit: number;
  shake: number;
  timeScale: number;
  
  activeLevelId: string;
  schema: LevelSchema;
  zyx: EntityState;
}

export interface Platform {
  id: string;
  rowIdx: number;
  x: number;
  y: number;
  width: number;
  height: number;
  val: number;
  isCorrect: boolean;
  optionId?: string;
  challengeId?: string;
  nextZyxVal?: number;
  errorModel?: MathErrorModel;
  impactTimer?: number;
  shattered?: boolean;
  shards?: { x: number; y: number; vx: number; vy: number; rot: number; vrot: number; pts: {x: number; y: number}[] }[];
  beamUpAura?: number;
}
