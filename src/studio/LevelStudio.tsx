import { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { LEVEL_DATABASE } from '../engine/LevelDatabase';
import { sceneFromLevel, sceneInventory, validateVisualScene } from './VisualScene';
import { sectorForCampaignLevel } from '../review/reviewMode';

const FIRST_OF_REALM = ['f1_sum10', 'f3_sum15', 'd1_sum20', 'v1_sum25', 'q1_sum30', 'q3_skip4'];

type NodeId = 'background' | 'platforms' | 'ambient' | 'environment' | 'plasma' | 'camera';

export default function LevelStudio() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [index, setIndex] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('level');
    const found = LEVEL_DATABASE.findIndex((level) => level.id === id);
    return found >= 0 ? found : 0;
  });
  const [node, setNode] = useState<NodeId>('plasma');
  const [mode, setMode] = useState<'edit' | 'play'>('edit');
  const [cameraOverlay, setCameraOverlay] = useState(false);
  const [parallaxDebug, setParallaxDebug] = useState(true);
  const level = LEVEL_DATABASE[index];
  const scene = sceneFromLevel(level);
  const inventory = sceneInventory(scene);
  const sector = sectorForCampaignLevel(level.id);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new GameEngine(canvas, LEVEL_DATABASE[index]);
    engineRef.current = engine;
    let frame = 0;
    if (mode === 'play') {
      engine.start();
    } else {
      const paint = () => {
        engine.draw();
        const ctx = canvas.getContext('2d');
        if (ctx && (cameraOverlay || parallaxDebug)) paintStudioOverlay(ctx, engine, cameraOverlay, parallaxDebug);
        frame = requestAnimationFrame(paint);
      };
      frame = requestAnimationFrame(paint);
    }
    return () => {
      cancelAnimationFrame(frame);
      engine.cleanup();
      engineRef.current = null;
    };
  }, [index, mode, cameraOverlay, parallaxDebug]);

  const check = validateVisualScene(scene);

  return (
    <div className="studio">
      <aside className="studio-side">
        <div className="eyebrow">Level Studio</div>
        <h1>{index + 1}. {sector?.name} </h1>
        <p className="fine">{level.id}</p>
        <label>
          Level
          <select value={index} onChange={(event) => setIndex(Number(event.target.value))}>
            {LEVEL_DATABASE.map((item, itemIndex) => (
              <option key={item.id} value={itemIndex}>{itemIndex + 1}. {item.id}</option>
            ))}
          </select>
        </label>
        <ul className="studio-tree">
          <li><button type="button" onClick={() => setNode('background')}>Background</button>
            <ul>
              {scene.background.layers.map((layer) => (
                <li key={layer.id}>{layer.id} · ×{layer.parallax} · {layer.objects} objects</li>
              ))}
            </ul>
          </li>
          <li><button type="button" onClick={() => setNode('platforms')}>Platforms · {scene.platforms.shape}</button></li>
          <li><button type="button" onClick={() => setNode('ambient')}>Ambient objective</button></li>
          <li><button type="button" onClick={() => setNode('environment')}>Environment</button></li>
          <li><button type="button" onClick={() => setNode('plasma')}>Plasma presentation</button></li>
          <li><button type="button" onClick={() => setNode('camera')}>Camera · {scene.camera.profile}</button></li>
        </ul>
        <div className="studio-jumps">
          {FIRST_OF_REALM.map((id) => (
            <button key={id} type="button" onClick={() => setIndex(LEVEL_DATABASE.findIndex((item) => item.id === id))}>{id}</button>
          ))}
        </div>
      </aside>
      <main className="studio-stage">
        <div className="studio-toolbar" data-ui="true">
          <button type="button" onClick={() => setMode('edit')}>Edit view</button>
          <button type="button" onClick={() => setMode('play')}>Play view</button>
          <button type="button" onClick={() => setCameraOverlay((value) => !value)}>Camera overlay</button>
          <button type="button" onClick={() => setParallaxDebug((value) => !value)}>Parallax debug</button>
        </div>
        <canvas ref={canvasRef} width={500} height={800} />
      </main>
      <aside className="studio-side">
        <div className="eyebrow">{node}</div>
        <Inspector node={node} scene={scene} />
        <h2>Completeness</h2>
        <ul className="studio-facts">
          <li>Background layers: {inventory.backgroundLayers}</li>
          <li>Parallax layers: {inventory.parallaxLayers}</li>
          <li>Environmental objects: {inventory.environmentalObjects}</li>
          <li>Platform profile: {inventory.platformProfile}</li>
          <li>Ambient: {inventory.ambientObjective}</li>
          <li>Particles: {inventory.particles}</li>
          <li>Lighting: {inventory.lighting}</li>
          <li>Camera: {inventory.cameraProfile}</li>
          <li>Unique overrides: {inventory.uniqueOverrides}</li>
        </ul>
        <p className="fine">{check.ok ? 'Scene matches the production validator.' : 'Scene rejected.'}</p>
        <p className="fine">R1 does not write files. Production schemas remain the source.</p>
      </aside>
    </div>
  );
}

function Inspector({ node, scene }: { node: NodeId; scene: ReturnType<typeof sceneFromLevel> }) {
  if (node === 'background') {
    return (
      <ul className="studio-facts">
        {scene.background.layers.map((layer) => (
          <li key={layer.id}>{layer.depth} · parallax {layer.parallax} · opacity {layer.opacity} · objects {layer.objects}</li>
        ))}
      </ul>
    );
  }
  if (node === 'platforms') return <p>Shape {scene.platforms.shape}. Geometry stays on the level route. This inspector does not edit answers.</p>;
  if (node === 'ambient') return <p>Large numeral, transparent background, value from the math engine.</p>;
  if (node === 'environment') return <p>Particles and lighting are still global. This level adds none.</p>;
  if (node === 'plasma') return <p>Historical heat fog and filled crest. The scene does not own wave position or speed.</p>;
  return <p>Profile {scene.camera.profile}. Vertical routes stay centered. Sideways routes finish on the landed row.</p>;
}

function paintStudioOverlay(
  ctx: CanvasRenderingContext2D,
  engine: GameEngine,
  cameraOverlay: boolean,
  parallaxDebug: boolean,
) {
  const width = engine.canvas.width;
  const height = engine.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (cameraOverlay) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);
    ctx.beginPath();
    ctx.moveTo(width / 2, 0);
    ctx.lineTo(width / 2, height);
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
  }
  if (parallaxDebug) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(8, height - 92, 220, 80);
    ctx.fillStyle = '#fbbf24';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    const frame = engine.renderer.lastPlasma;
    ctx.fillText(`camera ${engine.camera.x.toFixed(0)}, ${engine.camera.y.toFixed(0)}`, 16, height - 70);
    ctx.fillText(`shock ${frame?.shock.executed ? 'in window' : 'below view'}`, 16, height - 52);
    ctx.fillText(`fog ${frame?.fog?.intersectsViewport ? 'on screen' : 'missed'}`, 16, height - 34);
  }
  ctx.restore();
}
