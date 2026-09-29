import { CatastropheConfig } from '../config/configTypes';
import { DEFAULT_ZYX_CONFIG } from '../config/defaults';
import { GameEngine } from './GameEngine';

export const THERMAL_VARIANTS = [
  'FLASH VAPORIZATION',
  'PLASMA PEEL',
  'IONIZATION BURST',
  'THERMAL DISINTEGRATION',
  'CORE OVERLOAD',
  'PARTICLE DISSOLUTION',
  'ARC ANNIHILATION',
  'THERMAL COLLAPSE',
  'PLASMA SHEAR',
  'CORONA BURNOUT',
] as const;

const THERMAL_COLORS = [
  ['#fff7d6', '#ffd27a', '#ffffff'],
  ['#ff9a3c', '#ffd0a0', '#fff'],
  ['#9ad7ff', '#ffffff', '#d0f0ff'],
  ['#ff6a2a', '#ffd2a8', '#fff'],
  ['#fff', '#ffcf4a', '#ff5a1f'],
  ['#ffe7b0', '#ffb15a', '#fff'],
  ['#b9f3ff', '#ffffff', '#7ad7ff'],
  ['#ffb088', '#ff6a3c', '#fff'],
  ['#ffd0e0', '#ff8a5a', '#fff'],
  ['#fff4c2', '#ffb703', '#fff'],
];

export class MorticianAPI {
  type: string = '';
  deathComplete: boolean = false;
  config: CatastropheConfig;
  variant = 0;

  constructor(config: CatastropheConfig = DEFAULT_ZYX_CONFIG.catastrophe) {
    this.config = config;
  }

  init(type: string, engine: GameEngine) {
    this.type = type;
    this.deathComplete = false;

    const g = engine.state.zyx;
    g.jumping = false;
    g.falling = false;
    g.bouncing = false;

    if (type === 'void') {
      g.voidState = true;
      g.voidT = 0;
      g.voidAlpha = 1;
    } else if (type === 'wave') {
      g.waveState = true;
      g.waveT = 0;
      g.voidAlpha = 1;
      g._detonated = false;
      engine.state.timeScale = 1.0;
      this.variant = this.pickVariant(engine);
      engine.thermalLabel = THERMAL_VARIANTS[this.variant];
    }
  }

  update(dt: number, engine: GameEngine) {
    if (this.deathComplete) return;

    const g = engine.state.zyx;
    const S = engine.state;

    if (this.type === 'void') {
      g.voidT! += dt * this.config.voidSpeed;
      g.sx = 1; g.sy = 1; // reset velocities
      
      if (g.voidT! < 0.17) {
        g.x += Math.sin(g.voidT! * 100) * 4.2;
        g.rot = Math.sin(g.voidT! * 120) * 0.18;
        S.shake = Math.max(S.shake, g.voidT! / 0.17 * 28);
      } else if (g.voidT! < 0.62) {
        const p = (g.voidT! - 0.17) / 0.45;
        const p2 = p * p;
        g.sx = Math.max(0.04, 1 - p2 * 0.98);
        g.sy = 1 + p * 1.8 - p2 * 2.2;
        g.rot = p2 * Math.PI * 1.5;
        g.y -= p2 * 5.5;
        S.shake = 12 + p * 8;
      } else if (g.voidT! < 0.80) {
        const p = (g.voidT! - 0.62) / 0.18;
        g.sx = Math.max(0.02, 0.04 - p * 0.02);
        g.sy = Math.max(0.02, (1 - p * 0.9) * 0.5);
        g.voidAlpha = Math.max(0, 1 - p * 1.4);
        S.shake = (1 - p) * 10;
      } else {
        g.voidAlpha = 0;
        S.shake = 0;
        // spawn particles if we had them
        if (g.voidT! > 1.0) this.deathComplete = true;
        
        if (g.voidAlpha === 0 && !g._detonated) {
           g._detonated = true;
           for (let i = 0; i < 48; i++) {
             engine.particles.push({
               x: g.x, y: g.y - 50,
               vx: (Math.random()-0.5)*600, vy: (Math.random()-0.5)*600,
               life: 1.6,
               sz: 3 + Math.random()*5,
               color: ['#ffffff','#cc88ff','#00d2ff'][Math.floor(Math.random()*3)]
             });
           }
        }
      }
    } else if (this.type === 'wave') {
      g.waveT! += dt;
      const burn = 0.75;
      const done = 1.15;
      const p = Math.min(1, g.waveT! / burn);
      this.shapeThermal(p, g, S);
      if (g.waveT! >= burn && !g._detonated) {
        g._detonated = true;
        g.voidAlpha = 0;
        g.sx = 0.04;
        g.sy = 0.04;
        this.burst(engine, g.x, g.y - 30);
      }
      if (g.waveT! > done) this.deathComplete = true;
    }
  }

  private pickVariant(engine: GameEngine): number {
    if (engine.queuedThermal != null) {
      const forced = Math.max(0, Math.min(9, engine.queuedThermal));
      engine.lastThermal = forced;
      return forced;
    }
    let next = Math.floor(Math.random() * THERMAL_VARIANTS.length);
    if (next === engine.lastThermal) next = (next + 1) % THERMAL_VARIANTS.length;
    engine.lastThermal = next;
    return next;
  }

  private shapeThermal(p: number, g: GameEngine['state']['zyx'], S: GameEngine['state']) {
    const v = this.variant;
    S.shake = Math.max(S.shake, 8 + p * 16);
    g.voidAlpha = p < 0.82 ? 1 : Math.max(0, 1 - (p - 0.82) / 0.18);
    if (v === 0) {
      g.sx = 1 + Math.sin(p * 30) * 0.08;
      g.sy = 1 + (1 - p) * 0.2;
      g.rot = Math.sin(p * 40) * 0.2;
    } else if (v === 1) {
      g.sy = 1 + p * 0.8;
      g.sx = Math.max(0.2, 1 - p * 0.7);
      g.y += p * 0.6;
    } else if (v === 2) {
      g.rot = p * Math.PI * 2;
      g.sx = 1 + Math.sin(p * 24) * 0.25;
      g.sy = 1 - Math.sin(p * 24) * 0.15;
    } else if (v === 3) {
      g.x += Math.sin(p * 50) * 1.4;
      g.sx = Math.max(0.15, 1 - p);
      g.sy = Math.max(0.15, 1 - p * 0.8);
    } else if (v === 4) {
      const grow = p < 0.7 ? 1 + p * 0.7 : Math.max(0.1, 1.5 - (p - 0.7) * 4);
      g.sx = grow;
      g.sy = grow;
    } else if (v === 5) {
      g.voidAlpha = Math.max(0, 1 - p);
      g.sx = Math.max(0.2, 1 - p * 0.5);
      g.sy = g.sx;
    } else if (v === 6) {
      g.x += (Math.random() - 0.5) * 8 * p;
      g.rot = (Math.random() - 0.5) * 0.4;
    } else if (v === 7) {
      g.sy = Math.max(0.08, 1 - p * 0.92);
      g.sx = 1 + p * 0.6;
    } else if (v === 8) {
      g.rot = p * 0.9;
      g.x += p * 2.2;
      g.sx = 1 + p * 0.3;
    } else {
      g.sx = 1 + p * 0.35;
      g.sy = 1 + p * 0.35;
      g.voidAlpha = Math.max(0, 1 - p * 0.85);
    }
  }

  private burst(engine: GameEngine, x: number, y: number) {
    const colors = THERMAL_COLORS[this.variant] || THERMAL_COLORS[0];
    engine.fireImpact(4, 1.2, 8, 28);
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * Math.PI * 2;
      const speed = 80 + Math.random() * 220;
      engine.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed * 0.65 + 40,
        life: 1.1,
        sz: 2 + Math.random() * 3,
        color: colors[i % colors.length],
      });
    }
  }
}
