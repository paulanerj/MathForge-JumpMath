import { GameEngine } from './GameEngine';
import { ZyxConfig, DEFAULT_ZYX_CONFIG, getVisualCalibration } from '../config';
import { realmForLevel, type RealmSpec } from '../visual/realms';
import { drawSignature, drawWorldPlanes, tracePlatform } from '../visual/worldDraw';
import { derivePlasmaPresentation, PLASMA_PRESENTATION, PlasmaPresentation } from './plasmaPresentation';

const ZYX = (() => {
  const BODY = {
    torso: { x:-31, y:-100, w:62, h:100, radius:28 },
    outlineWidth: 2.5, numZoneCY: -27, numFontSize: 34,
  };
  const PALETTES: Record<string, any> = {
    content: { aura:'rgba(0,210,255,0.25)', bodyTop:'rgba(0,255,255,0.8)', bodyMid:'rgba(0,180,255,0.6)', bodyBase:'rgba(0,100,255,0.3)', outline:'rgba(0,255,255,0.8)', filamentCore:'#fff', filamentGlow:'rgba(0,210,255,0.8)', bulb:'#00d2ff', bulbGlow:'rgba(0,210,255,0.5)', sat:'#fff', satGlow:'#00d2ff', numFill:'#f0f8ff', numStroke:'rgba(0,15,50,0.90)', numGlow:'rgba(0,180,255,0.6)', numZoneBg:'rgba(0,140,255,0.10)' },
    danger: { aura:'rgba(255,160,50,0.30)', bodyTop:'rgba(255,180,50,0.8)', bodyMid:'rgba(255,120,50,0.6)', bodyBase:'rgba(180,50,20,0.3)', outline:'rgba(255,160,50,0.8)', filamentCore:'#fff', filamentGlow:'rgba(255,160,50,0.8)', bulb:'#ffa032', bulbGlow:'rgba(255,160,50,0.5)', sat:'#fff', satGlow:'#ffa032', numFill:'#fff0aa', numStroke:'rgba(40,15,0,0.90)', numGlow:'rgba(255,200,60,0.70)', numZoneBg:'rgba(255,180,40,0.14)' },
    critical: { aura:'rgba(255,50,50,0.35)', bodyTop:'rgba(255,100,50,0.9)', bodyMid:'rgba(255,50,50,0.7)', bodyBase:'rgba(200,0,0,0.4)', outline:'rgba(255,50,50,0.8)', filamentCore:'#fff', filamentGlow:'rgba(255,50,50,0.8)', bulb:'#ff3232', bulbGlow:'rgba(255,50,50,0.5)', sat:'#fff', satGlow:'#ff3232', numFill:'#ffdddd', numStroke:'rgba(60,0,0,0.95)', numGlow:'rgba(255,100,100,0.85)', numZoneBg:'rgba(255,50,50,0.20)' },
    heatSickness: {
        aura:'rgba(255,60,20,0.40)', bodyTop:'rgba(255,100,20,0.85)', bodyMid:'rgba(255,50,10,0.75)', bodyBase:'rgba(200,20,0,0.5)', outline:'rgba(255,100,20,0.9)', filamentCore:'#ffdddd', filamentGlow:'rgba(255,50,10,0.8)', bulb:'#ff3300', bulbGlow:'rgba(255,50,10,0.6)', sat:'#fff', satGlow:'#ff3300', numFill:'#fee2e2', numStroke:'rgba(80,0,0,0.90)', numGlow:'rgba(255,50,50,0.80)', numZoneBg:'rgba(255,50,20,0.20)'
    },
    thrilled: { aura:'rgba(50,255,100,0.3)', bodyTop:'rgba(50,255,150,0.9)', bodyMid:'rgba(20,200,100,0.7)', bodyBase:'rgba(0,150,50,0.4)', outline:'rgba(50,255,100,0.8)', filamentCore:'#fff', filamentGlow:'rgba(50,255,100,0.8)', bulb:'#32ff64', bulbGlow:'rgba(50,255,100,0.5)', sat:'#fff', satGlow:'#32ff64', numFill:'#e0ffe0', numStroke:'rgba(0,50,15,0.9)', numGlow:'rgba(50,255,100,0.7)', numZoneBg:'rgba(50,255,100,0.15)' },
    shocked: { aura:'rgba(200,200,255,0.3)', bodyTop:'rgba(220,220,255,0.8)', bodyMid:'rgba(150,150,200,0.6)', bodyBase:'rgba(100,100,150,0.3)', outline:'rgba(200,200,255,0.8)', filamentCore:'#fff', filamentGlow:'rgba(200,200,255,0.8)', bulb:'#ccccff', bulbGlow:'rgba(200,200,255,0.5)', sat:'#fff', satGlow:'#ccccff', numFill:'#ffffff', numStroke:'rgba(20,20,40,0.9)', numGlow:'rgba(200,200,255,0.7)', numZoneBg:'rgba(200,200,255,0.1)' },
    bored: { aura:'rgba(150,150,150,0.2)', bodyTop:'rgba(180,180,180,0.7)', bodyMid:'rgba(120,120,120,0.5)', bodyBase:'rgba(80,80,80,0.3)', outline:'rgba(180,180,180,0.6)', filamentCore:'#ccc', filamentGlow:'rgba(150,150,150,0.6)', bulb:'#999', bulbGlow:'rgba(150,150,150,0.4)', sat:'#ddd', satGlow:'#999', numFill:'#f0f0f0', numStroke:'rgba(30,30,30,0.9)', numGlow:'rgba(150,150,150,0.5)', numZoneBg:'rgba(150,150,150,0.1)' }
  };
  const EXPRESSIONS: Record<string, any> = {
    content: { eye: { yOff:-74, rX:8.5, rY:8.5, pupilR:3.0, glow:'rgba(0,210,255,0.28)', pupilCol:'#00d2ff' }, mouth:{ type:'smile', y:-53, r:7, a0:1.22, a1:1.78, col:'rgba(70,100,145,0.65)', lw:2.4 } },
    danger: { eye: { yOff:-74, rX:10.0, rY:10.0, pupilR:3.5, glow:'rgba(255,195,70,0.40)', pupilCol:'#ffdd88' }, mouth:{ type:'frown', y:-53, r:7, a0:0.22, a1:0.78, col:'rgba(170,130,70,0.78)', lw:2.4 } },
    critical: { eye: { yOff:-74, rX:12.0, rY:12.0, pupilR:4.5, glow:'rgba(255,100,100,0.50)', pupilCol:'#ffbbbb' }, mouth:{ type:'howl', y:-51, r:8, a0:0.1, a1:0.9, col:'rgba(200,50,50,0.85)', lw:3.0 } },
    thrilled: { eye: { yOff:-74, rX:9.0, rY:11.0, pupilR:4.0, glow:'rgba(50,255,100,0.4)', pupilCol:'#aaffaa' }, mouth:{ type:'smile', y:-50, r:9, a0:1.1, a1:1.9, col:'rgba(20,100,50,0.8)', lw:3.0 } },
    shocked: { eye: { yOff:-75, rX:11.0, rY:11.0, pupilR:1.5, glow:'rgba(200,200,255,0.4)', pupilCol:'#ffffff' }, mouth:{ type:'howl', y:-52, r:4, a0:0, a1:2, col:'rgba(50,50,80,0.8)', lw:2.0 } },
    bored: { eye: { yOff:-74, rX:8.0, rY:5.0, pupilR:2.5, glow:'rgba(150,150,150,0.2)', pupilCol:'#cccccc' }, mouth:{ type:'flat', y:-53, r:7, a0:0, a1:0, col:'rgba(80,80,80,0.6)', lw:2.4 } },
  };

  function draw(ctx: CanvasRenderingContext2D, g: any, mood: string, t: number, kilonovaDist: number = 100) {
    const isOverheating = kilonovaDist < 50;
    const pal = PALETTES[isOverheating ? 'heatSickness' : mood] || PALETTES.content;
    const expr = EXPRESSIONS[mood] || EXPRESSIONS.content;

    ctx.save();
    let renderX = g.x;
    let renderY = g.y - 20;

    // Mood / Cognitive Panic Jitter
    if (mood === 'danger') {
       renderY += Math.sin(t * 0.05) * 4; // Faster wobble
    } else if (mood === 'critical') {
       // Panic Dance jitter using high-frequency sine waves
       renderX += Math.sin(t * 0.25) * 3;
       renderY += Math.cos(t * 0.3) * 3;
    }

    ctx.translate(renderX, renderY);
    ctx.rotate(g.rot);
    
    // Base scale + slow heat melting stretch
    let heatStretchY = 1.0;
    if (isOverheating) {
       heatStretchY = 1.0 + Math.sin(t * 0.005) * 0.15; // Slow, melty stretch
    }
    ctx.scale(g.sx, g.sy * heatStretchY);

    // Continuous Aura glow
    const pulseScore = Math.sin(t * 0.005) * 15;
    const ag = ctx.createRadialGradient(0, -50, 12, 0, -50, 75 + pulseScore);
    ag.addColorStop(0, pal.aura); ag.addColorStop(1, 'transparent');
    ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(0, -50, 75 + pulseScore, 0, Math.PI * 2); ctx.fill();

    // Dimensional Energy Filaments and Bulb
    let filamentRot = 0;
    if (g.targetAngle !== undefined) {
       filamentRot = g.targetAngle + Math.PI / 2;
    } else {
       filamentRot = Math.sin(t * 0.002) * 0.15;
    }

    if (mood === 'critical') {
        filamentRot += (Math.random() - 0.5) * 0.6; // Furious zig-zag glitch
    }

    ctx.save();
    ctx.translate(0, -100);
    ctx.rotate(filamentRot);

    // Filaments (Arc lines)
    ctx.strokeStyle = pal.filamentCore;
    ctx.lineWidth = 3;
    ctx.shadowColor = pal.filamentGlow;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    if (mood === 'critical') {
       // Glitched filament path
       ctx.moveTo(-10, 0); ctx.lineTo(-15 + Math.random()*4, -15); ctx.lineTo(-5 + Math.random()*4, -30);
       ctx.moveTo(10, 0);  ctx.lineTo(15 + Math.random()*4, -15);  ctx.lineTo(5 + Math.random()*4, -30);
    } else {
       ctx.moveTo(-10, 0); ctx.quadraticCurveTo(-15, -15, -5, -30);
       ctx.moveTo(10, 0);  ctx.quadraticCurveTo(15, -15, 5, -30);
    }
    ctx.stroke();
    // Re-stroke for solid core
    ctx.shadowBlur = 0;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Central Plasma Bulb
    const bg = ctx.createRadialGradient(0, -35, 0, 0, -35, 15);
    bg.addColorStop(0, '#fff'); bg.addColorStop(0.4, pal.bulb); bg.addColorStop(1, 'transparent');
    ctx.fillStyle = bg;
    ctx.shadowColor = pal.bulbGlow; ctx.shadowBlur = 15;
    ctx.beginPath(); ctx.arc(0, -35, 12, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    // Orbiting Satellite Orb
    let satSpeedMult = 0.005;
    if (mood === 'danger') satSpeedMult = 0.015;
    else if (mood === 'critical') satSpeedMult = 0.045; // Max velocity

    const satX = Math.cos(t * satSpeedMult) * 22;
    const satY = -35 + Math.sin(t * satSpeedMult) * 8; // Slightly elliptical
    
    ctx.fillStyle = pal.sat;
    ctx.shadowColor = pal.satGlow; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(satX, satY, 4, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();

    // Main body jelly fill
    const { x: bx, y: by, w: bw, h: bh, radius: br } = BODY.torso;
    const bd = ctx.createLinearGradient(0, by, 0, 0);
    bd.addColorStop(0, pal.bodyTop); bd.addColorStop(0.5, pal.bodyMid); bd.addColorStop(1, pal.bodyBase);
    ctx.fillStyle = bd;
    
    ctx.shadowColor = pal.aura;
    ctx.shadowBlur = 20 + pulseScore * 0.5;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, br); ctx.fill();
    ctx.shadowBlur = 0;
    
    // Zyx Reflection (Pre-Shockwave Visuals)
    if (kilonovaDist < 50) {
       ctx.save();
       ctx.beginPath();
       ctx.roundRect(bx, by, bw, bh, br);
       ctx.clip(); // Clip precisely to Zyx's boundary

       const intensity = Math.min(1.0, (50 - kilonovaDist) / 50);
       const reflectGrad = ctx.createRadialGradient(bx + bw, by + bh, 10, bx + bw/2, by + bh/2, bw * 1.5);
       reflectGrad.addColorStop(0, `rgba(255, 200, 100, ${intensity * 0.8})`);
       reflectGrad.addColorStop(0.5, `rgba(255, 100, 0, ${intensity * 0.5})`);
       reflectGrad.addColorStop(1, 'transparent');
       
       ctx.fillStyle = reflectGrad;
       ctx.fillRect(bx, by, bw, bh);
       ctx.restore();
    }
    
    // Dark outline 
    ctx.strokeStyle = pal.outline; ctx.lineWidth = BODY.outlineWidth;
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, br); ctx.stroke();

    // Number zone glow patch
    const ncy = BODY.numZoneCY, ncx = 0;
    const nzg = ctx.createRadialGradient(ncx, ncy, 0, ncx, ncy, 30);
    nzg.addColorStop(0, pal.numZoneBg); nzg.addColorStop(1, 'transparent');
    ctx.fillStyle = nzg; ctx.beginPath(); ctx.roundRect(-28, -44, 56, 40, 10); ctx.fill();

    // NUMBER (Holographic layers)
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `bold ${BODY.numFontSize}px 'Orbitron',sans-serif`;
    ctx.strokeStyle = pal.numStroke; ctx.lineWidth = 4; ctx.lineJoin = 'round';
    ctx.strokeText(g.val, ncx, ncy);
    ctx.fillStyle = pal.numFill; ctx.fillText(g.val, ncx, ncy);
    ctx.shadowColor = pal.numGlow; ctx.shadowBlur = 18; ctx.fillStyle = pal.numFill;
    ctx.fillText(g.val, ncx, ncy); ctx.shadowBlur = 0;

    // Eyes
    const e = expr.eye;
    let pXoff = 0;
    let pYoff = 0;
    if (g.targetAngle !== undefined) {
       const scalar = e.rX - e.pupilR - Math.max(0.5, 2.0 - (e.pupilR * 0.5));
       pXoff = Math.cos(g.targetAngle) * scalar;
       pYoff = Math.sin(g.targetAngle) * scalar;
    } else {
       pXoff = 0;
       pYoff = 0;
    }

    [-12, 12].forEach(ex => {
      ctx.fillStyle = isOverheating ? 'rgba(255,255,0,0.5)' : e.glow; ctx.beginPath(); ctx.ellipse(ex, e.yOff, e.rX + 4, e.rY + 4, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(240,248,255,0.92)'; ctx.beginPath(); ctx.ellipse(ex, e.yOff, e.rX + 1, e.rY + 1, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0a1628'; ctx.beginPath(); ctx.ellipse(ex, e.yOff, e.rX, e.rY, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = isOverheating ? '#ffff00' : e.pupilCol; ctx.beginPath(); ctx.arc(ex + pXoff, e.yOff + pYoff, e.pupilR, 0, Math.PI * 2); ctx.fill();
    });

    // Mouth
    const m = expr.mouth; ctx.strokeStyle = m.col; ctx.lineWidth = m.lw || 2.4; ctx.lineCap = 'round';
    if (m.type === 'smile' || m.type === 'frown') { 
        ctx.beginPath(); ctx.arc(0, m.y, m.r, m.a0 * Math.PI, m.a1 * Math.PI); ctx.stroke(); 
    } else if (m.type === 'flat') {
        ctx.beginPath();
        ctx.moveTo(-m.r, m.y);
        ctx.lineTo(m.r, m.y);
        ctx.stroke();
    } else if (m.type === 'howl') {
        const wave = Math.sin(t * 0.05) * 3;
        ctx.beginPath();
        for (let ix = -10; ix <= 10; ix += 2) {
           if (ix === -10) ctx.moveTo(ix, m.y + Math.sin(ix * 0.5 + t * 0.05) * 3);
           else ctx.lineTo(ix, m.y + Math.sin(ix * 0.5 + t * 0.05) * 3);
        }
        ctx.stroke();
    }
    
    // Draw Bark Bubble
    if (g.bark) {
       ctx.save();
       ctx.translate(0, -145 + Math.sin(t * 0.05) * 3);
       
       ctx.font = "bold 16px 'Orbitron',sans-serif";
       const metrics = ctx.measureText(g.bark);
       const textW = Math.max(80, metrics.width + 30);
       const textH = 36;
       
       // Tail
       ctx.fillStyle = 'rgba(255,255,255,0.95)';
       ctx.beginPath();
       ctx.moveTo(0, textH/2 + 8);
       ctx.lineTo(-8, textH/2);
       ctx.lineTo(8, textH/2);
       ctx.fill();

       // Bubble
       ctx.beginPath();
       ctx.roundRect(-textW/2, -textH/2, textW, textH, 12);
       ctx.fill();
       
       ctx.fillStyle = '#0a1628';
       ctx.textAlign = 'center';
       ctx.textBaseline = 'middle';
       ctx.fillText(g.bark, 0, 0);
       
       ctx.restore();
    }

    ctx.restore();
  }
  return { draw };
})();

function drawPlatform(ctx: CanvasRenderingContext2D, p: any, t: number, isMorticianMode: boolean, targetPlatform: any, world: RealmSpec) {
  if (p.shattered && p.shards) {
    p.shards.forEach((sh: any) => {
      ctx.save();
      ctx.translate(sh.x, sh.y);
      ctx.rotate(sh.rot);
      ctx.fillStyle = '#450a0a';
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sh.pts[0].x, sh.pts[0].y);
      sh.pts.forEach((pt: any) => ctx.lineTo(pt.x, pt.y));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });
    return;
  }

  const hw = 64;
  const pulse = Math.sin(t * 0.0008 + (p.rowIdx || 0)) * 0.5 + 0.5;
  const isImpact = p.impactTimer !== undefined && p.impactTimer > 0;
  const structure = world.structure;
  const surfaceColor = isImpact ? '#fff' : 'rgba(6, 10, 18, 0.72)';
  const borderColor = isImpact ? '#fff' : structure;

  ctx.fillStyle = isImpact ? 'rgba(255,255,255,0.35)' : `${structure}22`;
  tracePlatform(ctx, p.x, p.y, world.platform);
  ctx.fill();
  if (world.platform === 'split') {
    ctx.beginPath();
    ctx.roundRect(p.x + hw * 0.38, p.y - 16, hw * 0.62, 32, 8);
    ctx.fill();
  }
  if (world.platform === 'ring') {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, hw * 0.42, 16, 0, 0, Math.PI * 2);
    ctx.fillStyle = surfaceColor;
    ctx.fill();
  }

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 1.6;
  ctx.globalAlpha = isImpact ? 1 : 0.45 + pulse * 0.4;
  tracePlatform(ctx, p.x, p.y, world.platform);
  ctx.stroke();
  if (world.platform === 'split') {
    ctx.beginPath();
    ctx.roundRect(p.x + hw * 0.38, p.y - 16, hw * 0.62, 32, 8);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(p.x - 30, p.y - 16, 60, 32);
  ctx.fillStyle = isImpact ? '#000' : '#f4f7ff';
  ctx.font = "bold 33px 'Orbitron',sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(p.val.toString(), p.x, p.y, hw * 1.4);
  ctx.textBaseline = 'alphabetic';
}

export interface PlasmaFogPass {
  executed: boolean;
  knY: number;
  outerRadius: number;
  intersectsViewport: boolean;
  stops: string[];
}

export interface PlasmaShockPass {
  executed: boolean;
  screenY: number;
  inWindow: boolean;
  haze: boolean;
  crestFill: boolean;
  whiteEdge: boolean;
  orangeGlow: boolean;
}

export interface PlasmaPresentationFrame {
  realm: string;
  order: string[];
  fog: PlasmaFogPass | null;
  shock: PlasmaShockPass;
  laterOpaqueCover: boolean;
  camera: { x: number; y: number };
  presentation: PlasmaPresentation | null;
}

class CelestialBackground {
  starsLayer: any[] = [];
  nebulaGas: any[] = [];
  foregroundDebris: any[] = [];
  lastFog: PlasmaFogPass | null = null;
  
  accumX: number = 0;
  accumY: number = 0;
  lastCamX: number | null = null;
  lastCamY: number | null = null;

  init() {
    // Layer 2: Midground Stars and Nebulae
    const P_COLORS = ['#fff', '#aaddff', '#ffaadd', '#aaffdd', '#ddaaff'];
    this.starsLayer = Array.from({ length: 150 }, () => ({
      x: Math.random() * 2000 - 500,
      y: Math.random() * 800 * 5, 
      sz: Math.random() * 2.5 + 0.3,
      b: Math.random() * 0.8 + 0.2, 
      ph: Math.random() * Math.PI * 2, 
      c: P_COLORS[Math.floor(Math.random() * P_COLORS.length)],
    }));

    this.nebulaGas = Array.from({ length: 8 }, () => ({
      x: Math.random() * 2000 - 500,
      y: Math.random() * 800 * 5,
      r: Math.random() * 300 + 200,
      color: `hsla(${Math.floor(Math.random() * 60) + 240}, 60%, 40%, 0.15)`
    }));

    // Layer 3: Foreground Energy Debris
    this.foregroundDebris = Array.from({ length: 12 }, () => ({
      x: Math.random() * 800 - 200,
      y: Math.random() * 1600 - 400,
      vx: (Math.random() - 0.5) * 20, 
      sz: Math.random() * 120 + 40,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.005,
      pts: Array.from({length: 6}, (_, i) => {
        const a = (i / 6) * Math.PI * 2 + (Math.random() * 0.2 - 0.1);
        const r = 1.0 - Math.random() * 0.3;
        return { a, r };
      })
    }));
  }

  draw(ctx: CanvasRenderingContext2D, width: number, height: number, camX: number, camY: number, t: number, theme: any, inFlow: boolean, kilonovaDist: number = 1000, flowSpeedMult: number = 1.8) {
    if (this.lastCamX === null) {
      this.lastCamX = camX;
      this.lastCamY = camY;
    }
    
    const dx = camX - this.lastCamX;
    const dy = camY - this.lastCamY;
    this.lastCamX = camX;
    this.lastCamY = camY;
    
    const speedMult = inFlow ? flowSpeedMult : 1.0;
    this.accumX += dx * speedMult;
    this.accumY += dy * speedMult;

    const bgGrad = ctx.createRadialGradient(width/2, height/2, 0, width/2, height/2, Math.max(width, height));
    bgGrad.addColorStop(0, inFlow ? '#020b14' : theme?.skyColors?.top || '#080820'); 
    bgGrad.addColorStop(0.5, theme?.skyColors?.mid || '#040412'); 
    bgGrad.addColorStop(1, theme?.skyColors?.base || '#010108');
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, width, height);
    const world = realmForLevel(theme);
    drawWorldPlanes(ctx, world, this.accumX, this.accumY, t, width, height);

    // The plasma wall is not painted here. derivePlasmaPresentation owns it. 

    // Layer 2: Medium Nebulae/Gas (0.05x)
    ctx.globalAlpha = 1;
    this.nebulaGas.forEach(n => {
      let ny = (n.y + this.accumY * 0.05) % (800 * 5);
      if (ny < -n.r) ny += 800 * 5;
      let nx = (n.x + this.accumX * 0.05) % 2000;
      if (nx < -n.r) nx += 2000;

      const ngrad = ctx.createRadialGradient(nx, ny, 0, nx, ny, n.r);
      ngrad.addColorStop(0, n.color);
      ngrad.addColorStop(1, 'transparent');
      ctx.fillStyle = ngrad;
      ctx.beginPath(); ctx.arc(nx, ny, n.r, 0, Math.PI * 2); ctx.fill();
    });

    // Layer 2: Starfield (0.05x)
    this.starsLayer.forEach(star => {
      let sy = (star.y + this.accumY * 0.05) % (800 * 5); 
      if (sy < 0) sy += 800 * 5; 
      let sx = (star.x + this.accumX * 0.05) % 2000;
      if (sx < 0) sx += 2000;
      if (sy > height || sx > width || sx < 0) return;
      
      const tw = 0.3 + Math.sin(t * 0.003 + star.ph) * 0.35 * (inFlow ? 0.3 : 1.0); 
      ctx.globalAlpha = star.b * tw; 
      ctx.fillStyle = star.c;
      const baseStretchX = star.sz * (inFlow ? 2.5 : 0.6);
      const stretchY = star.sz * 0.6;
      ctx.beginPath(); ctx.ellipse(sx, sy, baseStretchX, stretchY, 0, 0, Math.PI * 2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  
  drawForegroundDebris(ctx: CanvasRenderingContext2D, width: number, height: number, t: number) {
      // Layer 3: Foreground Energy Debris (1.5x)
      ctx.fillStyle = 'rgba(10, 15, 30, 0.4)';
      ctx.strokeStyle = 'rgba(0, 210, 255, 0.08)';
      ctx.lineWidth = 2;
      
      this.foregroundDebris.forEach(deb => {
          deb.x += deb.vx * (t * 0.0001);
          deb.rot += deb.vrot * Math.min(t * 0.01, 10);
          
          let dx = (deb.x + this.accumX * 1.5) % 1500;
          let dy = (deb.y + this.accumY * 1.5) % 2500;
          
          if (dx < -300) dx += 1500;
          if (dy < -400) dy += 2500;

          if (dy > height + 200 || dx > width + 200 || dx < -200) return;
          if (dx > width * 0.22 && dx < width * 0.78 && dy > height * 0.2 && dy < height * 0.8) return;

          ctx.save();
          ctx.globalAlpha = 0.22;
          ctx.translate(dx, dy);
          ctx.rotate(deb.rot);
          ctx.beginPath();
          
          deb.pts.forEach((pt: any, i: number) => {
             const px = Math.cos(pt.a) * deb.sz * pt.r;
             const py = Math.sin(pt.a) * deb.sz * pt.r;
             if (i === 0) ctx.moveTo(px, py);
             else ctx.lineTo(px, py);
          });
          
          ctx.closePath();
          ctx.filter = 'blur(6px)';
          ctx.fill();
          ctx.stroke();
          ctx.restore();
      });
      ctx.filter = 'none';
  }
}

export class Renderer {
  background: CelestialBackground;
  config: ZyxConfig;
  lastPlasma: PlasmaPresentationFrame | null = null;

  constructor(config: ZyxConfig = DEFAULT_ZYX_CONFIG) {
    this.config = config;
    this.background = new CelestialBackground();
    this.background.init();
  }

  draw(ctx: CanvasRenderingContext2D, engine: GameEngine, width: number, height: number) {
    ctx.filter = 'none'; // Fix Mortician state leak
    const t = performance.now();
    const camX = engine.camera.x;
    const camY = engine.camera.y;
    
    const isDying = engine.state.status === 'DYING';
    const inFlow = engine.state.flowState;
    const shakeX = engine.state.shake > 0 ? (Math.random() - 0.5) * engine.state.shake : 0;
    const shakeY = engine.state.shake > 0 ? (Math.random() - 0.5) * engine.state.shake : 0;

    ctx.save();
    ctx.translate(shakeX, shakeY);

    // 1. Celestial background (Layer 0)
    this.background.draw(ctx, width, height, camX, camY, t, engine.state.schema.theme, inFlow, engine.state.kilonovaDist, this.config.flow.bgSpeedMultiplier);

    const world = realmForLevel(engine.state.schema.theme);
    const gap = engine.state.wave ? engine.state.wave.y - engine.state.zyx.y : 9999;
    drawSignature(ctx, world, t, width, height, gap < this.config.wave.warningDistance);

    // 1b. Ambient Target Layer (Layer 1) — environmental number from authoritative math state
    // Drawn in screen space so it sits behind world gameplay but above deep background.
    this.drawAmbientTarget(ctx, engine, width, height, t);

    // 2. Setup World Matrix relative to camera (Layer 3 gameplay)
    ctx.save();
    ctx.translate(width / 2 - camX, height / 2 - camY);

    // 3. Render High-Fidelity Platforms
    engine.platformManager.platforms.forEach(p => {
      if (Math.abs(p.y - camY) > height || Math.abs(p.x - camX) > width) return;

      const isMorticianMode = engine.state.status === 'DYING';
      if (engine.state.zyx.currentRow > p.rowIdx) {
        ctx.globalAlpha = 0.2;
      }
      
      drawPlatform(ctx, p, t, isMorticianMode, engine.targetPlatform, realmForLevel(engine.state.schema.theme));
      ctx.globalAlpha = 1.0;
    });

    // 4. Draw Zyx Trail Rings
    engine.state.zyx.trail.forEach(tr => {
       ctx.save();
       ctx.globalAlpha = tr.life * (tr.isFlow ? 0.28 : 0.14);
       ctx.fillStyle = world.accent;
       ctx.beginPath();
       ctx.arc(tr.x, tr.y - 20, 22 * tr.life, 0, Math.PI * 2);
       ctx.fill();
       ctx.restore();
    });
    
    // Draw Particles
    engine.particles.forEach(pt => {
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = Math.max(0, Math.min(0.45, pt.life));
        ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.sz, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    const zyxNow = engine.state.zyx;
    if (engine.heat > 0.04 && engine.state.status === 'playing') {
      ctx.save();
      ctx.translate(zyxNow.x, zyxNow.y - 40);
      ctx.globalAlpha = 0.45 * engine.heat;
      const glow = ctx.createRadialGradient(0, 30, 4, 0, 30, 48);
      glow.addColorStop(0, 'rgba(255,176,64,0.95)');
      glow.addColorStop(1, 'rgba(255,70,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.ellipse(0, 30, 36, 16 + engine.heat * 12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const forming = engine.reformT < 1 && !isDying;
    if (forming) {
      ctx.save();
      ctx.translate(zyxNow.x, zyxNow.y);
      ctx.globalAlpha = Math.min(1, engine.reformT * 2.4);
      ctx.fillStyle = '#fff6d0';
      ctx.shadowColor = '#ffb703';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(0, -48, 3 + engine.reformT * 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      if (engine.reformT > 0.18) {
        ctx.globalAlpha = Math.min(1, (engine.reformT - 0.18) / 0.45);
        ctx.strokeStyle = 'rgba(255,196,90,0.95)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(-31, -100, 62, 100, 28);
        ctx.stroke();
      }
      ctx.restore();
    }

    // 5. Render High-Fidelity Zyx
    const showBody = !forming || engine.reformT >= 0.62;
    const reformAlpha = forming ? Math.max(0, (engine.reformT - 0.62) / 0.38) : 1;
    if (showBody && engine.state.zyx.voidAlpha !== 0 && engine.state.zyx.voidAlpha !== undefined) {
        ctx.globalAlpha = (forming ? reformAlpha : 1) * engine.state.zyx.voidAlpha;
        ZYX.draw(ctx, engine.state.zyx, engine.state.zyx.mood, t, engine.state.kilonovaDist);
        ctx.globalAlpha = 1.0;
    } else if (showBody && engine.state.zyx.voidAlpha === undefined && !isDying) {
        ctx.globalAlpha = reformAlpha;
        ZYX.draw(ctx, engine.state.zyx, engine.state.zyx.mood, t, engine.state.kilonovaDist);
        ctx.globalAlpha = 1.0;
    }

    ctx.restore(); // Restores camera matrix translation and global filters
    ctx.restore(); // Restores shake matrix translation

    const plasma = engine.state.wave
      ? derivePlasmaPresentation({
          waveY: engine.state.wave.y,
          playerY: engine.state.zyx.y,
          cameraY: camY,
          viewportHeight: height,
          spawnDistance: this.config.wave.spawnDistanceBehind,
          collisionDistance: this.config.wave.proximityCollisionDist,
          warningDistance: this.config.wave.warningDistance,
        })
      : null;
    if (plasma) this.paintPlasmaWall(ctx, plasma, width, height, t);

    // IMPACT SCREEN FLASH
    if (engine.state.impactFlash > 0) {
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // CHROMATIC SPLIT
    if (engine.state.chromaSplit > 0.3) {
      const cs = engine.state.chromaSplit;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = 0.30;
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(-cs, 0, width, height);
      ctx.fillStyle = '#00ffff';
      ctx.fillRect(cs, 0, width, height);
      ctx.restore();
    }
    
    // Foreground Debris (Draws above the world space but responds to parallax)
    this.background.drawForegroundDebris(ctx, width, height, t);

    // 5b. Operation label (Layer 2) — compact plaque; not competing with ambient number
    this.drawOperationLabel(ctx, engine, width, height, t);

    // 6. Score, combo, and time live in the page top row.
    // Level clear and menus are React screens. The canvas does not draw a second modal.

    const waveDeath = isDying && engine.state.deathType === 'wave';
    const recalibrating = waveDeath && (engine.state.zyx.waveT || 0) > 0.7 || (!isDying && engine.reformT < 0.92);
    if (recalibrating) {
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(255,214,140,0.95)';
      ctx.font = "bold 22px 'Orbitron', sans-serif";
      ctx.fillText('PLASMA CONTACT', width / 2, height / 2 - 8, 420);
      ctx.fillStyle = 'rgba(248,250,252,0.88)';
      ctx.font = "16px 'Orbitron', sans-serif";
      ctx.fillText('RECALIBRATING...', width / 2, height / 2 + 22, 420);
      if (engine.plasmaProbe && engine.thermalLabel) {
        ctx.fillStyle = 'rgba(148,163,184,0.9)';
        ctx.font = "12px 'Orbitron', sans-serif";
        ctx.fillText(engine.thermalLabel, width / 2, height / 2 + 48, 420);
      }
    } else if (isDying && engine.mortician.deathComplete) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#ef4444';
      ctx.textAlign = 'center';
      ctx.font = "bold 44px 'Orbitron', sans-serif";
      ctx.fillText('MORTICIAN ACTIVE', width / 2, height / 2 - 20, 450);
      ctx.font = "20px 'Orbitron', sans-serif";
      ctx.fillStyle = '#f8fafc';
      ctx.fillText(
        engine.plasmaProbe
          ? `YOU DIED (${String(engine.state.deathType || 'unknown')}). Tap anywhere to resurrect.`
          : 'YOU DIED. Tap anywhere to resurrect.',
        width / 2,
        height / 2 + 30,
        450
      );
    }

    const laterOpaqueCover = engine.state.impactFlash > 0 || (isDying && engine.mortician.deathComplete);
    const look = PLASMA_PRESENTATION;
    const crestDrawn = plasma?.physical.visible === true;
    this.background.lastFog = plasma
      ? {
          executed: true,
          knY: plasma.physical.screenY,
          outerRadius: look.crest.body,
          intersectsViewport: plasma.atmosphere.viewportCoverage > 0,
          stops: [look.heat.white, look.heat.orange, look.heat.red, look.heat.purple, look.heat.clear],
        }
      : null;
    this.lastPlasma = {
      realm: world.id,
      order: ['atmosphere', crestDrawn ? 'crest' : 'crest-offscreen', laterOpaqueCover ? 'opaque-cover' : 'clear'],
      fog: this.background.lastFog,
      shock: {
        executed: crestDrawn,
        screenY: plasma?.physical.screenY ?? 0,
        inWindow: crestDrawn,
        haze: crestDrawn,
        crestFill: crestDrawn,
        whiteEdge: crestDrawn,
        orangeGlow: crestDrawn,
      },
      laterOpaqueCover,
      camera: { x: camX, y: camY },
      presentation: plasma,
    };
  }

  /**
   * Atmosphere is a viewport tint. The crest is drawn only at the wave's
   * projected screen position, and only when that position meets the view.
   */
  private paintPlasmaWall(
    ctx: CanvasRenderingContext2D,
    plasma: PlasmaPresentation,
    width: number,
    height: number,
    t: number,
  ): boolean {
    const look = PLASMA_PRESENTATION.crest;
    const air = plasma.atmosphere;
    const cover = Math.max(24, air.viewportCoverage * height);
    const top = height - cover;
    ctx.save();
    const field = ctx.createLinearGradient(0, top, 0, height);
    field.addColorStop(0, PLASMA_PRESENTATION.heat.clear);
    field.addColorStop(0.35, PLASMA_PRESENTATION.heat.purple);
    field.addColorStop(0.7, PLASMA_PRESENTATION.heat.red);
    field.addColorStop(1, PLASMA_PRESENTATION.heat.orange);
    ctx.globalAlpha = air.heatIntensity;
    ctx.fillStyle = field;
    ctx.fillRect(0, top, width, cover);
    if (!plasma.physical.visible) {
      ctx.restore();
      return false;
    }
    const y = plasma.physical.screenY;
    const t2 = t * 0.004;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(-20, y + 50);
    for (let x = -20; x <= width + 20; x += 14) {
      const roll = Math.sin(x * 0.021 + t2 * 2.2) * look.rollA + Math.sin(x * 0.047 - t2 * 3.1) * look.rollB;
      ctx.lineTo(x, y + roll);
    }
    ctx.lineTo(width + 20, Math.min(height, y + look.body));
    ctx.lineTo(-20, Math.min(height, y + look.body));
    ctx.closePath();
    const body = ctx.createLinearGradient(0, y - 20, 0, y + 140);
    body.addColorStop(0, look.gold);
    body.addColorStop(0.3, look.red);
    body.addColorStop(1, look.bodyEnd);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 14) {
      const roll = Math.sin(x * 0.021 + t2 * 2.2) * look.rollA + Math.sin(x * 0.047 - t2 * 3.1) * look.rollB;
      x === -20 ? ctx.moveTo(x, y + roll) : ctx.lineTo(x, y + roll);
    }
    ctx.strokeStyle = look.edge;
    ctx.lineWidth = look.edgeWidth;
    ctx.shadowColor = look.glow;
    ctx.shadowBlur = look.glowBlur;
    ctx.stroke();
    ctx.restore();
    return true;
  }

  /**
   * Layer 1 — Ambient Target: large low-contrast environmental numeral.
   * Bound exclusively to MathChallengeEngine.getAmbientObjectiveForRow (authoritative).
   */
  private drawAmbientTarget(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    width: number,
    height: number,
    t: number
  ) {
    if (engine.state.status === 'level_complete' || engine.state.status === 'DYING') return;

    const nextRow = engine.state.zyx.currentRow + 1;
    const objective = engine.mathEngine.getAmbientObjectiveForRow(nextRow);
    if (!objective) return;

    const valueStr = String(objective.ambientValue);
    const digits = valueStr.length;
    const cal = getVisualCalibration().ambientTarget;

    // Responsive base × calibration scale
    const unit = Math.min(width, height) * (digits <= 1 ? 0.66 : digits === 2 ? 0.58 : 0.46);
    const baseSize = unit * cal.targetNumberScale;
    const cx = width * 0.5;
    const cy = height * 0.42 + cal.targetNumberOffsetY;

    // Calibration opacity with subtle breath (does not override user opacity)
    const breath = 1 + Math.sin(t * 0.0012) * 0.08;
    const alpha = Math.max(0.05, Math.min(1, cal.targetNumberOpacity * breath));

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    let size = baseSize;
    ctx.font = `900 ${size}px 'Orbitron', sans-serif`;
    const limit = width * 0.85;
    const measured = ctx.measureText(valueStr).width;
    if (measured > limit && measured > 0) {
      size *= limit / measured;
      ctx.font = `900 ${size}px 'Orbitron', sans-serif`;
    }

    // Glyphs only. No maxWidth text box and no background rectangle.
    ctx.lineWidth = Math.max(2, size * 0.018);
    ctx.strokeStyle = `rgba(100, 200, 255, ${alpha * 1.6})`;
    ctx.shadowColor = `rgba(0, 180, 255, ${alpha * 0.8})`;
    ctx.shadowBlur = size * 0.06;
    ctx.strokeText(valueStr, cx, cy);

    ctx.shadowBlur = 0;
    ctx.fillStyle = `rgba(140, 210, 255, ${alpha * 0.55})`;
    ctx.fillText(valueStr, cx, cy);

    ctx.restore();
  }

  /**
   * Layer 2 — Operation label plaque (e.g. SUM TO). Smaller, persistent, non-interactive.
   * Same authoritative objective source as the ambient numeral.
   */
  private drawOperationLabel(
    ctx: CanvasRenderingContext2D,
    engine: GameEngine,
    width: number,
    height: number,
    _t: number
  ) {
    if (engine.state.status === 'level_complete' || engine.state.status === 'DYING') return;

    const nextRow = engine.state.zyx.currentRow + 1;
    const objective = engine.mathEngine.getAmbientObjectiveForRow(nextRow);
    if (!objective) return;

    const label = objective.label;
    const gCal = getVisualCalibration().goalIndicator;
    const s = gCal.scale;

    // Responsive base × calibration scale
    const padX = 28 * s;
    const padY = 16 * s;
    const fontSize = Math.max(28, Math.min(42, width * 0.09)) * s;

    ctx.save();
    ctx.font = `700 ${fontSize}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textW = ctx.measureText(label).width;
    const boxW = textW + padX * 2;
    const boxH = fontSize + padY * 2;
    const bx = width / 2 - boxW / 2;
    // Below top HUD band + calibrated Y offset
    const by = 100 + gCal.offsetY;

    // Translucent holographic plaque
    ctx.fillStyle = 'rgba(6, 20, 40, 0.62)';
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.45)';
    ctx.lineWidth = Math.max(1, 2 * Math.min(s, 1.5));
    const r = 14 * Math.min(s, 1.5);
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.lineTo(bx + boxW - r, by);
    ctx.quadraticCurveTo(bx + boxW, by, bx + boxW, by + r);
    ctx.lineTo(bx + boxW, by + boxH - r);
    ctx.quadraticCurveTo(bx + boxW, by + boxH, bx + boxW - r, by + boxH);
    ctx.lineTo(bx + r, by + boxH);
    ctx.quadraticCurveTo(bx, by + boxH, bx, by + boxH - r);
    ctx.lineTo(bx, by + r);
    ctx.quadraticCurveTo(bx, by, bx + r, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(165, 243, 252, 0.9)';
    ctx.fillText(label, width / 2, by + boxH / 2);

    ctx.restore();
  }
}
