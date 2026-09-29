import { LEVEL_DATABASE } from '../engine/LevelDatabase';
import { LevelSchema } from '../types';
import { RealmId, RealmSpec, realmForLevel } from '../visual/realms';

/** Read-only description of what the production renderer currently draws. */
export interface VisualScene {
  levelId: string;
  realm: RealmId;
  palette: {
    sky: { top: string; mid: string; base: string };
    structure: string;
    accent: string;
  };
  background: {
    layers: SceneLayer[];
  };
  platforms: {
    shape: RealmSpec['platform'];
    presentation: 'realm-shape';
  };
  ambientObjective: {
    source: 'math';
    background: 'transparent';
  };
  environment: {
    particles: 'global-landing';
    lighting: 'default';
  };
  plasma: {
    presentation: 'historical-heat';
  };
  camera: {
    profile: 'vertical-center' | 'row-travel';
  };
  uniqueOverrides: number;
}

export interface SceneLayer {
  id: string;
  depth: 'sky' | 'far' | 'mid' | 'near' | 'foreground';
  parallax: number;
  opacity: number;
  objects: number;
}

export interface SceneIssue {
  path: string;
  message: string;
}

const DEPTHS = new Set(['sky', 'far', 'mid', 'near', 'foreground']);

/** These factors are what worldDraw.ts and CelestialBackground actually use. */
export function productionLayers(): SceneLayer[] {
  return [
    { id: 'sky', depth: 'sky', parallax: 0, opacity: 1, objects: 0 },
    { id: 'far-motifs', depth: 'far', parallax: 0.02, opacity: 0.16, objects: 3 },
    { id: 'mid-motifs', depth: 'mid', parallax: 0.08, opacity: 0.22, objects: 6 },
    { id: 'near-accents', depth: 'near', parallax: 0.25, opacity: 0.4, objects: 14 },
    { id: 'foreground-debris', depth: 'foreground', parallax: 1.5, opacity: 0.22, objects: 0 },
  ];
}

export function sceneFromLevel(level: LevelSchema): VisualScene {
  const realm = realmForLevel(level.theme);
  const sideways = level.progressionVector.x !== 0;
  return {
    levelId: level.id,
    realm: realm.id,
    palette: {
      sky: { ...realm.sky },
      structure: realm.structure,
      accent: realm.accent,
    },
    background: { layers: productionLayers() },
    platforms: { shape: realm.platform, presentation: 'realm-shape' },
    ambientObjective: { source: 'math', background: 'transparent' },
    environment: { particles: 'global-landing', lighting: 'default' },
    plasma: { presentation: 'historical-heat' },
    camera: { profile: sideways ? 'row-travel' : 'vertical-center' },
    uniqueOverrides: 0,
  };
}

export function sceneInventory(scene: VisualScene) {
  const layers = scene.background.layers;
  return {
    levelId: scene.levelId,
    realm: scene.realm,
    backgroundLayers: layers.length,
    parallaxLayers: layers.filter((layer) => layer.parallax !== 0).length,
    environmentalObjects: layers.reduce((sum, layer) => sum + layer.objects, 0),
    platformProfile: scene.platforms.shape,
    ambientObjective: scene.ambientObjective.background,
    particles: scene.environment.particles,
    lighting: scene.environment.lighting,
    cameraProfile: scene.camera.profile,
    uniqueOverrides: scene.uniqueOverrides,
  };
}

export function validateVisualScene(input: unknown): { ok: true; scene: VisualScene } | { ok: false; errors: SceneIssue[] } {
  const errors: SceneIssue[] = [];
  if (!input || typeof input !== 'object') {
    return { ok: false, errors: [{ path: '', message: 'scene is not an object' }] };
  }
  const scene = input as Partial<VisualScene> & { wave?: unknown };
  if (typeof scene.levelId !== 'string' || !LEVEL_DATABASE.some((level) => level.id === scene.levelId)) {
    errors.push({ path: 'levelId', message: 'scene does not name a campaign level' });
  }
  const known = new Set(LEVEL_DATABASE.map((level) => realmForLevel(level.theme).id));
  if (!scene.realm || !known.has(scene.realm as RealmId)) {
    errors.push({ path: 'realm', message: 'unknown realm' });
  }
  if (scene.plasma?.presentation !== 'historical-heat') {
    errors.push({ path: 'plasma.presentation', message: 'plasma look must stay the historical heat' });
  }
  if (scene.ambientObjective?.background !== 'transparent') {
    errors.push({ path: 'ambientObjective.background', message: 'ambient number background must stay transparent' });
  }
  if ('wave' in scene || 'waveY' in (scene as object)) {
    errors.push({ path: 'wave', message: 'a visual scene cannot own the physical wave' });
  }
  if (!Array.isArray(scene.background?.layers) || scene.background.layers.length === 0) {
    errors.push({ path: 'background.layers', message: 'scene has no layers' });
  } else {
    scene.background.layers.forEach((layer, index) => {
      if (!layer || !DEPTHS.has(layer.depth) || !Number.isFinite(layer.parallax)) {
        errors.push({ path: `background.layers.${index}`, message: 'layer depth or parallax is invalid' });
      }
    });
  }
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, scene: scene as VisualScene };
}
