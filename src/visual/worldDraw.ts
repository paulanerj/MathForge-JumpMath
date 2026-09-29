import type { CrestStyle, MotifId, RealmSpec } from './realms';

function motif(ctx: CanvasRenderingContext2D, id: MotifId, x: number, y: number, s: number, t: number): void {
  ctx.beginPath();
  if (id === 'lattice') {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * s;
      const py = y + Math.sin(a) * s * 0.86;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.stroke();
  } else if (id === 'shell') {
    const rot = t * 0.00015;
    ctx.arc(x, y, s, rot, rot + Math.PI * 1.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, s * 0.62, rot + 1, rot + 1 + Math.PI);
    ctx.stroke();
  } else if (id === 'field') {
    ctx.moveTo(x - s, y);
    ctx.bezierCurveTo(x - s * 0.3, y - s * 0.8, x + s * 0.3, y + s * 0.8, x + s, y);
    ctx.stroke();
  } else if (id === 'grid') {
    ctx.strokeRect(x - s, y - s * 0.6, s * 2, s * 1.2);
    ctx.moveTo(x, y - s * 0.6);
    ctx.lineTo(x, y + s * 0.6);
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.stroke();
  } else if (id === 'scan') {
    ctx.setLineDash([8, 10]);
    ctx.moveTo(0, y);
    ctx.lineTo(900, y);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (id === 'filament') {
    ctx.moveTo(x - s, y);
    for (let i = 1; i <= 6; i++) {
      const px = x - s + (i / 6) * s * 2;
      const py = y + Math.sin(i + t * 0.002) * s * 0.35;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else if (id === 'fringe') {
    ctx.moveTo(x - s, y);
    for (let i = 0; i <= 8; i++) {
      const px = x - s + (i / 8) * s * 2;
      const py = y + Math.sin(i * 0.9 + t * 0.001) * 8;
      ctx.lineTo(px, py);
    }
    ctx.stroke();
  } else {
    ctx.arc(x, y, s * 0.7, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Planes 0–2. Screen space. Never the play plane. */
export function drawWorldPlanes(
  ctx: CanvasRenderingContext2D,
  realm: RealmSpec,
  ax: number,
  ay: number,
  t: number,
  w: number,
  h: number,
): void {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = realm.structure;
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 3; i++) {
    const x = ((i * 240 + ax * 0.02) % (w + 180)) - 20;
    const y = ((i * 200 + ay * 0.02) % (h + 160)) - 10;
    motif(ctx, realm.far[i % 2], x, y, 70 + i * 16, t);
  }
  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 6; i++) {
    const x = ((i * 130 + ax * 0.08) % (w + 40));
    const y = ((i * 110 + ay * 0.08) % (h + 30));
    if (x > w * 0.3 && x < w * 0.7 && y > h * 0.25 && y < h * 0.75) continue;
    motif(ctx, realm.far[0], x, y, 28, t);
  }
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = realm.accent;
  for (let i = 0; i < 14; i++) {
    const x = ((i * 97 + ax * 0.25) % w);
    const y = ((i * 71 + ay * 0.25 + t * 0.012) % h);
    ctx.beginPath();
    ctx.arc(x, y, 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** One signature per realm. Only the quantum fringe answers the front. */
export function drawSignature(
  ctx: CanvasRenderingContext2D,
  realm: RealmSpec,
  t: number,
  w: number,
  h: number,
  waveWarning: boolean,
): void {
  ctx.save();
  ctx.strokeStyle = realm.structure;
  ctx.fillStyle = realm.accent;
  ctx.lineWidth = 1;
  if (realm.id === 'lattice') {
    const breathe = 0.7 + Math.sin(t * 0.0015) * 0.3;
    ctx.globalAlpha = 0.2 * breathe;
    ctx.beginPath();
    ctx.arc(w * 0.12, h * 0.18, 5 * breathe, 0, Math.PI * 2);
    ctx.arc(w * 0.88, h * 0.82, 4 * breathe, 0, Math.PI * 2);
    ctx.fill();
  } else if (realm.id === 'orbital') {
    ctx.globalAlpha = 0.28;
    const rot = t * 0.0002;
    ctx.beginPath();
    ctx.arc(w * 0.86, h * 0.14, 34, rot, rot + Math.PI * 1.4);
    ctx.stroke();
  } else if (realm.id === 'field') {
    ctx.globalAlpha = 0.14;
    for (const y of [h * 0.08, h * 0.92]) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y - 10, w * 0.7, y + 10, w, y);
      ctx.stroke();
    }
  } else if (realm.id === 'signal') {
    ctx.globalAlpha = 0.32;
    ctx.setLineDash([6, 8]);
    const y = (t * 0.03) % (h * 0.12);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.setLineDash([]);
  } else if (realm.id === 'plasma') {
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.moveTo(w * 0.08, h * 0.94);
    ctx.lineTo(w * 0.18, h * 0.74);
    ctx.moveTo(w * 0.92, h * 0.94);
    ctx.lineTo(w * 0.8, h * 0.74);
    ctx.stroke();
  } else if (waveWarning) {
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    for (let i = 0; i <= 18; i++) {
      const x = (i / 18) * w;
      const y = h * 0.08 + Math.sin(i * 0.7 + t * 0.004) * 6;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

export function crestOffset(x: number, t2: number, crest: CrestStyle): number {
  const roll = Math.sin(x * 0.021 + t2 * 2.2) * 9 + Math.sin(x * 0.047 - t2 * 3.1) * 5;
  if (crest === 'smooth') return Math.sin(x * 0.012 + t2) * 4;
  if (crest === 'filament') return Math.sin(x * 0.07 + t2 * 3) * 14;
  if (crest === 'scan') return (Math.floor(x / 26) % 2 === 0 ? 7 : -3);
  if (crest === 'fringed') return roll * 0.4 + Math.sin(x * 0.15 + t2) * 4;
  if (crest === 'doubled') return roll * 0.55;
  return roll;
}

export function tracePlatform(ctx: CanvasRenderingContext2D, x: number, y: number, shape: RealmSpec['platform']): void {
  const hw = 64;
  ctx.beginPath();
  if (shape === 'disc') {
    ctx.ellipse(x, y, hw * 0.72, 28, 0, 0, Math.PI * 2);
  } else if (shape === 'ring') {
    ctx.ellipse(x, y, hw * 0.8, 30, 0, 0, Math.PI * 2);
  } else if (shape === 'hex') {
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * hw * 0.82;
      const py = y + Math.sin(a) * 26;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  } else if (shape === 'narrow') {
    ctx.roundRect(x - hw * 0.55, y - 18, hw * 1.1, 36, 8);
  } else if (shape === 'split') {
    ctx.roundRect(x - hw, y - 16, hw * 0.62, 32, 8);
  } else {
    ctx.roundRect(x - hw, y - 22, hw * 2, 40, 10);
  }
}
