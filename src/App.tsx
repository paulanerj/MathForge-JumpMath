import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './engine/GameEngine';
import { LevelSchema } from './types';
import { describeLevelObjective } from './math/objectivePresentation';
import { CAMPAIGN_SECTORS, SectorDef } from './engine/LevelDatabase';
import {
  campaignReviewPlaylist,
  reviewIndexForLevel,
  reviewLaunchFromSearch,
  sectorForCampaignLevel,
} from './review/reviewMode';
import { DEFAULT_ZYX_CONFIG } from './config';
import {
  getVisualCalibration,
  setRuntimeVisualCalibration,
  replaceRuntimeVisualCalibration,
  persistVisualCalibration,
  restoreProductionDefaults,
  resetVisualCalibrationToDefaults,
  exportVisualCalibrationJson,
  importVisualCalibrationJson,
  type VisualCalibrationConfig,
} from './config/visualCalibration';

// ─── Persistence ────────────────────────────────────────────────────────────
const STORAGE_KEY = 'zyrxmath_progress_v2';
const MUTE_KEY = 'zyrxmath_audio_muted_v1';

interface SessionEvidence {
  cleanCorrects: number;
  hintedCorrects: number;
  mathMisses: number;
  waveDeaths: number;
  timerDeaths: number;
}

interface PlayerProgress {
  sectorsCleared: string[];
  highScore: number;
  bestCombo: number;
  totalCorrect: number;
  totalGames: number;
  lastPlayed: number;
  resumeSectorId: string | null;
  resumeLevelIndex: number;
  lastSession: SessionEvidence | null;
}

const DEFAULT_PROGRESS: PlayerProgress = {
  sectorsCleared: [],
  highScore: 0,
  bestCombo: 0,
  totalCorrect: 0,
  totalGames: 0,
  lastPlayed: 0,
  resumeSectorId: null,
  resumeLevelIndex: 0,
  lastSession: null,
};

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PROGRESS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PROGRESS };
}

function saveProgress(p: PlayerProgress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch { /* ignore */ }
}

// Level-scope objective text comes from the math presentation authority.
// Row-scope text is read from MathChallengeEngine during play.

const COMPLETION_HOLD_MS = 750;

type CompletedPresentation = {
  where: string;
  label: string | null;
  value: number | null;
  hasNext: boolean;
};

// ─── Types ──────────────────────────────────────────────────────────────────
type Screen = 'title' | 'campaign' | 'custom' | 'ready' | 'playing' | 'cleared' | 'stats';

const CUSTOM_THEMES = [
  { background: 'dark', skyColors: { top: '#080820', mid: '#040412', base: '#010108' }, palette: 'content' },
  { background: 'nebula', skyColors: { top: '#1a0820', mid: '#0d0412', base: '#050108' }, palette: 'content' },
  { background: 'void', skyColors: { top: '#000000', mid: '#080010', base: '#000000' }, palette: 'danger' },
  { background: 'frozen', skyColors: { top: '#082020', mid: '#041212', base: '#010808' }, palette: 'content' },
  { background: 'cyber', skyColors: { top: '#0a1a1a', mid: '#051010', base: '#020505' }, palette: 'content' },
];

const CUSTOM_VECTORS = [
  { x: 0, y: -1 },
  { x: 0.25, y: -1 },
  { x: -0.25, y: -1 },
  { x: 0.5, y: -0.85 },
  { x: -0.5, y: -0.85 },
];

const initialReview = reviewLaunchFromSearch(typeof window === 'undefined' ? '' : window.location.search);
const initialPlasmaLab = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('plasmaProbe') === '1';

// ─── Component ──────────────────────────────────────────────────────────────
export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [muted, setMuted] = useState(() => {
    try { return localStorage.getItem(MUTE_KEY) === '1'; } catch { return false; }
  });

  const [reviewMode, setReviewMode] = useState(initialReview.enabled);
  const [reviewList, setReviewList] = useState(false);
  const [screen, setScreen] = useState<Screen>(initialReview.enabled ? 'ready' : initialPlasmaLab ? 'playing' : 'title');
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [activeSector, setActiveSector] = useState<SectorDef | null>(() => {
    if (initialReview.enabled) {
      const levels = campaignReviewPlaylist();
      return sectorForCampaignLevel(levels[reviewIndexForLevel(initialReview.levelId)]?.id ?? '');
    }
    if (initialPlasmaLab) return CAMPAIGN_SECTORS[0];
    return null;
  });
  const [playlist, setPlaylist] = useState<LevelSchema[]>(() => {
    if (initialReview.enabled) return campaignReviewPlaylist();
    if (initialPlasmaLab) return CAMPAIGN_SECTORS[0].levels;
    return [];
  });
  const [levelIdx, setLevelIdx] = useState(() => (
    initialReview.enabled ? reviewIndexForLevel(initialReview.levelId) : 0
  ));
  const [sessionScore, setSessionScore] = useState(0);
  const [sessionCombo, setSessionCombo] = useState(0);
  const [levelStats, setLevelStats] = useState({ score: 0, combo: 0, correct: 0 });
  const [completedLevel, setCompletedLevel] = useState<CompletedPresentation | null>(null);
  const completionTimerRef = useRef<number | null>(null);
  const playRef = useRef({ playlist, levelIdx, activeSector });
  playRef.current = { playlist, levelIdx, activeSector };

  // Custom mission state
  const [mathMode, setMathMode] = useState<'SUM_TO' | 'SKIP_COUNT' | 'MULTIPLY' | 'DIFFERENCE'>('SUM_TO');
  const [targetsInput, setTargetsInput] = useState('10, 15, 20');
  const [customFactor, setCustomFactor] = useState(3);
  const [visualCal, setVisualCal] = useState<VisualCalibrationConfig>(() => getVisualCalibration());
  const [calibrationMode, setCalibrationMode] = useState(false);
  const [playMenu, setPlayMenu] = useState(false);
  const [probeOn, setProbeOn] = useState(false);
  const scoreEl = useRef<HTMLSpanElement>(null);
  const comboEl = useRef<HTMLSpanElement>(null);
  const timeEl = useRef<HTMLSpanElement>(null);
  const plasmaReadoutRef = useRef<HTMLPreElement>(null);
  const [calSessionSnapshot, setCalSessionSnapshot] = useState<VisualCalibrationConfig | null>(null);
  const [calCollapsed, setCalCollapsed] = useState(false);
  const [calDock, setCalDock] = useState<'bottom' | 'left' | 'right'>('bottom');
  const [copyDone, setCopyDone] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');

  const syncVisualState = useCallback((cfg: VisualCalibrationConfig) => {
    setVisualCal({
      ambientTarget: { ...cfg.ambientTarget },
      goalIndicator: { ...cfg.goalIndicator },
    });
  }, []);

  /** Live preview only — does not persist until Apply. */
  const previewVisual = useCallback((partial: Partial<VisualCalibrationConfig>) => {
    const next = setRuntimeVisualCalibration(partial);
    syncVisualState(next);
  }, [syncVisualState]);

  const calibrationModeRef = useRef(false);
  useEffect(() => {
    calibrationModeRef.current = calibrationMode;
    if (calibrationMode) {
      console.log('[CALIBRATION 06] render condition true');
      console.log('[CALIBRATION 07] calibration panel mounted');
    }
  }, [calibrationMode]);

  const enterCalibration = useCallback(() => {
    console.log('[CALIBRATION 02] enterCalibration entered', { screen });
    if (screen !== 'playing') {
      console.log('[CALIBRATION] early-exit: screen is not playing', screen);
      return;
    }
    const snap = {
      ambientTarget: { ...getVisualCalibration().ambientTarget },
      goalIndicator: { ...getVisualCalibration().goalIndicator },
    };
    console.log('[CALIBRATION 03] request open', { before: false });
    setCalSessionSnapshot(snap);
    setCalCollapsed(false);
    setCalibrationMode(true);
    engineRef.current?.setCalibrationFrozen(true);
    console.log('[CALIBRATION 04] state -> true; [05] freeze requested');
  }, [screen]);

  const exitCalibration = useCallback((restore: boolean) => {
    if (restore && calSessionSnapshot) {
      replaceRuntimeVisualCalibration(calSessionSnapshot);
      syncVisualState(calSessionSnapshot);
    }
    engineRef.current?.setCalibrationFrozen(false);
    setCalibrationMode(false);
    setCalSessionSnapshot(null);
    setImportOpen(false);
  }, [calSessionSnapshot, syncVisualState]);

  const applyCalibration = useCallback(() => {
    persistVisualCalibration();
    engineRef.current?.setCalibrationFrozen(false);
    setCalibrationMode(false);
    setCalSessionSnapshot(null);
    setImportOpen(false);
  }, []);

  const handleResetToDefaults = useCallback(() => {
    const next = resetVisualCalibrationToDefaults();
    syncVisualState(next);
  }, [syncVisualState]);

  const handleRestoreProduction = useCallback(() => {
    const next = restoreProductionDefaults();
    syncVisualState(next);
  }, [syncVisualState]);

  const handleCopyConfig = useCallback(async () => {
    const json = exportVisualCalibrationJson();
    try {
      await navigator.clipboard.writeText(json);
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    } catch {
      window.prompt('Copy visual config JSON:', json);
    }
  }, []);

  const handleDownloadConfig = useCallback(() => {
    const json = exportVisualCalibrationJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mathforge-visual-config.json';
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImportConfig = useCallback(() => {
    const next = importVisualCalibrationJson(importText);
    if (!next) {
      alert('Invalid JSON — calibration not changed.');
      return;
    }
    syncVisualState(next);
    setImportOpen(false);
    setImportText('');
  }, [importText, syncVisualState]);

  // ── Engine lifecycle ────────────────────────────────────────────────────
  const destroyEngine = useCallback(() => {
    if (completionTimerRef.current != null) {
      window.clearTimeout(completionTimerRef.current);
      completionTimerRef.current = null;
    }
    if (engineRef.current) {
      engineRef.current.cleanup();
      engineRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (screen !== 'playing' || !canvasRef.current || playlist.length === 0) return;

    const schema = playlist[levelIdx];
    if (!schema) return;

    if (!engineRef.current) {
      const plasmaProbe = new URLSearchParams(window.location.search).get('plasmaProbe') === '1';
      engineRef.current = new GameEngine(canvasRef.current, schema, DEFAULT_ZYX_CONFIG);
      engineRef.current.plasmaProbe = plasmaProbe;
      setProbeOn(plasmaProbe);
      engineRef.current.audio.setMuted(muted);
      engineRef.current.audio.init();
    } else {
      engineRef.current.loadSchema(schema);
    }

    engineRef.current.onLevelComplete = () => {
      const eng = engineRef.current;
      if (!eng) return;
      const score = eng.state.score ?? 0;
      const combo = eng.state.combo ?? 0;
      const correct = eng.correctInRow ?? 0;
      const attempts = eng.challengeTrace.attempts();
      const survival = eng.challengeTrace.events.filter((e) => e.kind === 'survival');
      const lastSession: SessionEvidence = {
        cleanCorrects: attempts.filter((a) => a.correct && !a.hintActive).length,
        hintedCorrects: attempts.filter((a) => a.correct && a.hintActive).length,
        mathMisses: attempts.filter((a) => !a.correct).length,
        waveDeaths: survival.filter((e) => e.kind === 'survival' && e.failureClass === 'wave').length,
        timerDeaths: survival.filter((e) => e.kind === 'survival' && e.failureClass === 'timer').length,
      };
      const ctx = playRef.current;
      const done = describeLevelObjective(ctx.playlist[ctx.levelIdx]?.mathConfig);
      setCompletedLevel({
        where: reviewMode
          ? `REVIEW MODE · ${ctx.levelIdx + 1}/${ctx.playlist.length}`
          : `${ctx.activeSector ? ctx.activeSector.name : 'Custom'} · ${ctx.levelIdx + 1}/${ctx.playlist.length}`,
        label: done?.label ?? null,
        value: done?.value ?? null,
        hasNext: ctx.levelIdx + 1 < ctx.playlist.length,
      });
      if (!reviewMode) {
        setProgress((p) => {
          const next = { ...p, lastSession, lastPlayed: Date.now() };
          saveProgress(next);
          return next;
        });
      }
      setLevelStats({ score, combo, correct });
      setSessionScore(s => s + score);
      setSessionCombo(c => Math.max(c, combo));
      if (completionTimerRef.current != null) {
        window.clearTimeout(completionTimerRef.current);
      }
      completionTimerRef.current = window.setTimeout(() => {
        completionTimerRef.current = null;
        setScreen('cleared');
      }, COMPLETION_HOLD_MS);
    };

    engineRef.current.start();

    let hudFrame = 0;
    const paintHud = () => {
      const eng = engineRef.current;
      if (eng) {
        if (scoreEl.current) scoreEl.current.textContent = String(eng.state.score);
        if (comboEl.current) comboEl.current.textContent = String(eng.state.combo);
        if (timeEl.current) timeEl.current.textContent = `${eng.state.timeLeft.toFixed(1)}s`;
        if (plasmaReadoutRef.current) {
          const view = eng.plasmaPresentation();
          plasmaReadoutRef.current.textContent = view
            ? `WORLD\nplayer ${eng.state.zyx.y.toFixed(0)}  cam ${eng.camera.y.toFixed(0)}\nwave ${view.physical.worldY.toFixed(0)}  front ${view.physical.worldY.toFixed(0)}\nSCREEN\nwave ${view.physical.screenY.toFixed(0)}  front ${view.physical.screenY.toFixed(0)}\ngap ${view.physicalGap.toFixed(0)}  threat ${view.atmosphere.threat01.toFixed(2)}`
            : '';
        }
      }
      hudFrame = requestAnimationFrame(paintHud);
    };
    hudFrame = requestAnimationFrame(paintHud);

    /** HUD / form controls must not be treated as gameplay taps. */
    const isUiEventTarget = (target: EventTarget | null): boolean => {
      if (!(target instanceof Element)) return false;
      return Boolean(
        target.closest(
          'button, a, input, textarea, select, label, [data-ui], [data-calibrate], [role="button"]'
        )
      );
    };

    const handleClick = (e: MouseEvent) => {
      if (screen !== 'playing') return;
      if (calibrationModeRef.current) return;
      if (engineRef.current?.state.status !== 'playing') return;
      if (isUiEventTarget(e.target)) return;
      engineRef.current?.handleInput(e.clientX, e.clientY);
    };
    const handleTouch = (e: TouchEvent) => {
      if (screen !== 'playing') return;
      if (calibrationModeRef.current) return;
      if (engineRef.current?.state.status !== 'playing') return;
      // Critical: do NOT preventDefault on HUD buttons — that blocks the
      // synthetic click React needs for onClick on mobile.
      if (isUiEventTarget(e.target)) return;
      e.preventDefault();
      const t = e.changedTouches[0];
      if (t) engineRef.current?.handleInput(t.clientX, t.clientY);
    };

    const root = surfaceRef.current;
    if (!root) return;
    root.addEventListener('click', handleClick);
    root.addEventListener('touchend', handleTouch, { passive: false });

    return () => {
      cancelAnimationFrame(hudFrame);
      root.removeEventListener('click', handleClick);
      root.removeEventListener('touchend', handleTouch);
    };
  }, [screen, levelIdx, playlist, reviewMode]);

  // Cleanup on leave play flow
  useEffect(() => {
    if (screen !== 'playing' && screen !== 'cleared' && screen !== 'ready') {
      destroyEngine();
    }
  }, [screen, destroyEngine]);

  // ── Actions ─────────────────────────────────────────────────────────────
  const startSector = (sector: SectorDef, levelIndex = 0) => {
    setActiveSector(sector);
    setPlaylist(sector.levels);
    setLevelIdx(Math.max(0, Math.min(levelIndex, sector.levels.length - 1)));
    setSessionScore(0);
    setSessionCombo(0);
    setScreen('ready');
  };

  const continueCampaign = () => {
    const sector = CAMPAIGN_SECTORS.find((s) => s.id === progress.resumeSectorId) ?? CAMPAIGN_SECTORS[0];
    if (!isSectorUnlocked(sector) && sector.id !== CAMPAIGN_SECTORS[0].id) {
      startSector(CAMPAIGN_SECTORS[0], 0);
      return;
    }
    startSector(sector, progress.resumeLevelIndex || 0);
  };

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      engineRef.current?.audio.setMuted(next);
      return next;
    });
  };

  const startCustom = () => {
    const targets = targetsInput.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
    if (targets.length === 0) return;

    const newPlaylist: LevelSchema[] = targets.map((t, i) => {
      let mathConfig: LevelSchema['mathConfig'];
      if (mathMode === 'SUM_TO') mathConfig = { mode: 'SUM_TO', target: t };
      else if (mathMode === 'SKIP_COUNT') mathConfig = { mode: 'SKIP_COUNT', step: t };
      else if (mathMode === 'MULTIPLY') mathConfig = { mode: 'MULTIPLY', factor: customFactor || t, minMultiplier: 1, maxMultiplier: 12 };
      else mathConfig = { mode: 'DIFFERENCE', maxValue: t };

      return {
        id: `custom_${i}`,
        mathConfig,
        progressionVector: CUSTOM_VECTORS[i % CUSTOM_VECTORS.length],
        theme: CUSTOM_THEMES[i % CUSTOM_THEMES.length],
      };
    });

    setActiveSector(null);
    setPlaylist(newPlaylist);
    setLevelIdx(0);
    setSessionScore(0);
    setSessionCombo(0);
    setScreen('ready');
  };

  const beginPlay = () => {
    engineRef.current?.setCalibrationFrozen(false);
    setScreen('playing');
  };

  const stepReview = (delta: number) => {
    const levels = campaignReviewPlaylist();
    const next = (levelIdx + delta + levels.length) % levels.length;
    setActiveSector(sectorForCampaignLevel(levels[next].id));
    setLevelIdx(next);
    setReviewList(false);
  };

  const openReviewLevel = (index: number) => {
    const levels = campaignReviewPlaylist();
    const next = Math.max(0, Math.min(levels.length - 1, index));
    setActiveSector(sectorForCampaignLevel(levels[next].id));
    setLevelIdx(next);
    setReviewList(false);
    setScreen('ready');
  };

  const proceedNext = () => {
    if (reviewMode) {
      // Review never writes campaign progress.
      if (levelIdx + 1 < playlist.length) {
        stepReview(1);
        setScreen('ready');
      } else {
        setReviewList(true);
        setScreen('ready');
      }
      return;
    }

    // Update progress
    const newProgress = { ...progress };
    newProgress.totalGames += 1;
    newProgress.totalCorrect += levelStats.correct;
    newProgress.highScore = Math.max(newProgress.highScore, sessionScore + levelStats.score);
    newProgress.bestCombo = Math.max(newProgress.bestCombo, Math.max(sessionCombo, levelStats.combo));
    newProgress.lastPlayed = Date.now();

    if (levelIdx + 1 < playlist.length) {
      if (activeSector) {
        newProgress.resumeSectorId = activeSector.id;
        newProgress.resumeLevelIndex = levelIdx + 1;
      }
      setProgress(newProgress);
      saveProgress(newProgress);
      engineRef.current?.setCalibrationFrozen(true);
      setLevelIdx(i => i + 1);
      setScreen('ready');
    } else {
      if (activeSector && !newProgress.sectorsCleared.includes(activeSector.id)) {
        newProgress.sectorsCleared = [...newProgress.sectorsCleared, activeSector.id];
      }
      const sectorIdx = activeSector ? CAMPAIGN_SECTORS.findIndex((s) => s.id === activeSector.id) : -1;
      const nextSector = sectorIdx >= 0 ? CAMPAIGN_SECTORS[sectorIdx + 1] : undefined;
      if (nextSector) {
        newProgress.resumeSectorId = nextSector.id;
        newProgress.resumeLevelIndex = 0;
      }
      setProgress(newProgress);
      saveProgress(newProgress);
      setScreen(activeSector ? 'campaign' : 'title');
      destroyEngine();
    }
  };

  const quitToMenu = () => {
    destroyEngine();
    if (reviewMode) {
      setReviewList(true);
      setScreen('ready');
      return;
    }
    setScreen(activeSector ? 'campaign' : 'title');
  };

  const isSectorUnlocked = (sector: SectorDef) => {
    if (sector.unlockRequirement === 0) return true;
    return progress.sectorsCleared.length >= sector.unlockRequirement;
  };

  // ── Render helpers ──────────────────────────────────────────────────────
  const modeLabel = (mode: string) => {
    switch (mode) {
      case 'SUM_TO': return 'Sum To';
      case 'SKIP_COUNT': return 'Skip Count';
      case 'MULTIPLY': return 'Multiply';
      case 'DIFFERENCE': return 'Difference';
      default: return mode;
    }
  };

  // ── Screens ─────────────────────────────────────────────────────────────
  return (
    <div ref={surfaceRef} className={`game-wrapper ${screen === 'playing' ? 'is-playing' : ''}`}>
      {/* Canvas always present when needed */}
      {(screen === 'playing' || screen === 'cleared' || screen === 'ready') && (
        <canvas
          ref={canvasRef}
          width={500}
          height={800}
        />
      )}

      {/* ═══ GET READY — objective orientation before play ═══ */}
      {screen === 'ready' && (() => {
        const obj = describeLevelObjective(playlist[levelIdx]?.mathConfig);
        return (
          <div className="ready-screen" onClick={beginPlay} onTouchEnd={(e) => { e.preventDefault(); beginPlay(); }}>
            <div>
              <div className="ready-kicker">Get Ready</div>
              {obj ? (
                <>
                  <div className="ready-label">{obj.label}</div>
                  <div className="ready-value">{obj.value}</div>
                </>
              ) : (
                <div className="ready-label">Level {levelIdx + 1}</div>
              )}
              <div className="ready-tap">Tap to launch</div>
              {reviewMode && (
                <div className="ready-meta">{playlist[levelIdx]?.id} · {levelIdx + 1}/{playlist.length}</div>
              )}
              {activeSector && !reviewMode && (
                <div className="ready-meta">{activeSector.name} · L{levelIdx + 1}/{playlist.length}</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ═══ TITLE SCREEN ═══ */}
      {screen === 'title' && (
        <div className="menu-screen absolute inset-0 flex z-50 overflow-hidden">
          {/* Starfield decoration */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  width: Math.random() > 0.8 ? 2 : 1,
                  height: Math.random() > 0.8 ? 2 : 1,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  opacity: 0.3 + Math.random() * 0.7,
                }}
              />
            ))}
          </div>

          <div className="relative max-w-md">
            <div className="eyebrow">Path of the Numerix</div>
            <h1 className="brand-title">JUMPMATH</h1>
            <p className="lede">Arithmetic fluency under calm pressure.</p>
            <p className="fine">Ages 7–11 · short home sessions · not a worksheet, not a casino.</p>

            <div>
              {progress.resumeSectorId && (
                <button
                  onClick={continueCampaign}
                  className="btn-primary"
                >
                  Continue
                </button>
              )}
              <button
                onClick={() => setScreen('campaign')}
                className="btn-primary"
              >
                Campaign
              </button>
              <button
                onClick={() => setScreen('custom')}
                className="btn-secondary"
              >
                Custom Mission
              </button>
              <button
                onClick={() => setScreen('stats')}
                className="btn-ghost"
              >
                Stats & Records
              </button>
              <button
                onClick={toggleMute}
                className="btn-ghost"
              >
                {muted ? 'Sound off' : 'Sound on'}
              </button>
              <button
                onClick={() => {
                  // Start Foundation L1 then open calibration after short delay via campaign
                  alert('Start a level, then tap CALIBRATE on the game screen for live visual tuning.');
                }}
                className="btn-ghost btn-amber"
              >
                Visual Calibration
              </button>
            </div>

            {progress.highScore > 0 && (
              <div>
                Best Score <span>{progress.highScore}</span>
                {' · '}
                Best Combo <span>{progress.bestCombo}×</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ CAMPAIGN SELECT ═══ */}
      {screen === 'campaign' && (
        <div className="menu-screen menu-scroll absolute inset-0 z-50 overflow-y-auto">
          <div className="max-w-md mx-auto px-5 py-8">
            <button onClick={() => setScreen('title')} className="menu-back">
              ← Back
            </button>
            <h2 className="menu-title">Sectors</h2>
            <p className="fine menu-intro">Practice one skill family at a time. Clear a sector when the facts start to feel quiet.</p>

            <div>
              {CAMPAIGN_SECTORS.map((sector, idx) => {
                const unlocked = isSectorUnlocked(sector);
                const cleared = progress.sectorsCleared.includes(sector.id);
                return (
                  <button
                    key={sector.id}
                    disabled={!unlocked}
                    onClick={() => unlocked && startSector(sector)}
                    className={`sector-card ${unlocked ? '' : 'is-locked'}`}
                  >
                    <div className="flex items-start gap-4">
                      <div>
                        {sector.badge}
                      </div>
                      <div className="flex-1">
                        <div className="flex">
                          <span>
                            {sector.name}
                          </span>
                          {cleared && <span>Cleared</span>}
                        </div>
                        <p>{sector.description}</p>
                        <div>
                          {sector.levels.length} levels · {unlocked ? 'Ready' : `Clear ${sector.unlockRequirement} sector${sector.unlockRequirement > 1 ? 's' : ''} to unlock`}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ CUSTOM MISSION ═══ */}
      {screen === 'custom' && (
        <div className="absolute inset-0 z-50 overflow-y-auto">
          <div className="max-w-md mx-auto px-5 py-8">
            <button onClick={() => setScreen('title')}>
              ← Back
            </button>
            <h2>Custom Mission</h2>

            <div>
              <div>
                <label>Operation Mode</label>
                <div>
                  {(['SUM_TO', 'SKIP_COUNT', 'MULTIPLY', 'DIFFERENCE'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setMathMode(m)}
                    >
                      {modeLabel(m)}
                    </button>
                  ))}
                </div>
              </div>

              {mathMode === 'MULTIPLY' && (
                <div>
                  <label>Factor (times table)</label>
                  <input
                    type="number"
                    min={2}
                    max={12}
                    value={customFactor}
                    onChange={e => setCustomFactor(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                  />
                </div>
              )}

              <div>
                <label>
                  {mathMode === 'SUM_TO' && 'Targets (CSV)'}
                  {mathMode === 'SKIP_COUNT' && 'Step sizes (CSV)'}
                  {mathMode === 'MULTIPLY' && 'Ignored — uses factor above'}
                  {mathMode === 'DIFFERENCE' && 'Max values (CSV)'}
                </label>
                <input
                  type="text"
                  value={targetsInput}
                  onChange={e => setTargetsInput(e.target.value)}
                  disabled={mathMode === 'MULTIPLY'}
                  placeholder="10, 20, 30"
                />
              </div>

              <button
                onClick={startCustom}
              >
                Launch Hyper-Jump
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STATS ═══ */}
      {screen === 'stats' && (
        <div className="absolute inset-0 z-50 overflow-y-auto">
          <div className="max-w-md mx-auto px-5 py-8">
            <button onClick={() => setScreen('title')}>
              ← Back
            </button>
            <h2>Records</h2>
            <p>
              For a parent. This is practice, not a mastery score. No ads in play. The Foundation campaign stays free.
            </p>

            <div>
              {[
                { label: 'High Score', value: progress.highScore },
                { label: 'Best Combo', value: `${progress.bestCombo}×` },
                { label: 'Total Correct', value: progress.totalCorrect },
                { label: 'Levels continued', value: progress.totalGames },
              ].map(stat => (
                <div key={stat.label}>
                  <div>{stat.value}</div>
                  <div>{stat.label}</div>
                </div>
              ))}
            </div>

            {progress.lastSession && (
              <div>
                <div>Last level</div>
                <p>
                  {progress.lastSession.cleanCorrects} clean · {progress.lastSession.hintedCorrects} with hint · {progress.lastSession.mathMisses} misses
                  {(progress.lastSession.waveDeaths + progress.lastSession.timerDeaths) > 0
                    ? ` · front ${progress.lastSession.waveDeaths} · clock ${progress.lastSession.timerDeaths}`
                    : ''}
                </p>
              </div>
            )}

            <h3>Sector Progress</h3>
            <div>
              {CAMPAIGN_SECTORS.map(s => (
                <div key={s.id} className="flex">
                  <span>{s.badge}</span>
                  <span className="flex-1">{s.name}</span>
                  <span>
                    {progress.sectorsCleared.includes(s.id) ? 'Cleared' : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══ LEVEL / SECTOR CLEARED ═══ */}
      {screen === 'cleared' && completedLevel && (
          <div className="clear-screen" data-ui="true">
            <div className="clear-card">
              <div className="ready-kicker">{completedLevel.hasNext ? 'Level clear' : 'Sector cleared'}</div>
              <div className="clear-where">{completedLevel.where}</div>
              {completedLevel.label != null && completedLevel.value != null && (
                <>
                  <div className="ready-label">{completedLevel.label}</div>
                  <div className="clear-next-value">{completedLevel.value}</div>
                </>
              )}
              <div className="clear-stats">
                <div><b>{levelStats.score}</b><span>Score</span></div>
                <div><b>{levelStats.combo}×</b><span>Combo</span></div>
                <div><b>{levelStats.correct}</b><span>Correct</span></div>
              </div>
              <button type="button" className="btn-primary" data-ui="true" onClick={proceedNext}>
                {completedLevel.hasNext ? 'Continue' : 'Return to sectors'}
              </button>
              <button type="button" className="btn-ghost" data-ui="true" onClick={quitToMenu}>
                Quit to menu
              </button>
            </div>
          </div>
      )}

      {/* ═══ IN-GAME HUD OVERLAY ═══ */}
      {screen === 'playing' && (
        <div className="play-hud">
          <button
            type="button"
            data-ui="true"
            onClick={(e) => {
              e.stopPropagation();
              setPlayMenu(true);
              engineRef.current?.setCalibrationFrozen(true);
            }}
          >
            Menu
          </button>
          <div className="play-stats">
            <span>SCORE <b ref={scoreEl}>0</b></span>
            <span>COMBO <b ref={comboEl}>0</b></span>
          </div>
          <span className="play-time">TIME <b ref={timeEl}>0.0s</b></span>
          {reviewMode && <span className="review-chip">Review</span>}
        </div>
      )}

      {screen === 'ready' && (
        <button
          type="button"
          className="settings-launch"
          data-ui="true"
          onClick={(event) => {
            event.stopPropagation();
            setPlayMenu(true);
          }}
        >
          Settings
        </button>
      )}

      {reviewMode && reviewList && (
        <div className="menu-screen menu-scroll review-list absolute inset-0 z-50 overflow-y-auto" data-ui="true">
          <div className="max-w-md mx-auto px-5 py-8">
            <div className="eyebrow">REVIEW MODE</div>
            <h2 className="menu-title">All 30 levels</h2>
            <p className="fine menu-intro">Inspection only. Campaign progress is not written.</p>
            {campaignReviewPlaylist().map((level, index) => {
              const sector = sectorForCampaignLevel(level.id);
              return (
                <button
                  key={level.id}
                  type="button"
                  data-ui="true"
                  className="sector-card"
                  onClick={(e) => {
                    e.stopPropagation();
                    openReviewLevel(index);
                  }}
                >
                  {index + 1}. {sector?.name ?? 'Campaign'} · {level.id}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {screen === 'playing' && probeOn && (
        <div className="plasma-lab" data-ui="true">
          <div className="ready-kicker">Plasma lab</div>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.freezePlasmaTime(); }}>Freeze time</button>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.moveLabPlayer(-1); }}>Move player up</button>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.moveLabPlayer(1); }}>Move player down</button>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.moveLabCamera(-1); }}>Move camera up</button>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.moveLabCamera(1); }}>Move camera down</button>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.advancePlasmaTime(); }}>Advance time</button>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.playPlasmaPursuit(); }}>Play pursuit</button>
          <button type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.resetPlasmaLab(); }}>Reset</button>
          {(['distant', 'approaching', 'warning', 'danger', 'collision'] as const).map((state) => (
            <button key={state} type="button" data-ui="true" onClick={(event) => { event.stopPropagation(); engineRef.current?.inspectPlasma(state); }}>
              {state}
            </button>
          ))}
          <pre ref={plasmaReadoutRef} />
        </div>
      )}

      {(screen === 'playing' || screen === 'ready') && playMenu && !calibrationMode && (
        <div className="play-menu" data-ui="true">
          <div className="play-menu-card">
            <div className="ready-kicker">Settings</div>
            <div className="play-menu-level">
              {reviewMode ? 'REVIEW MODE' : (activeSector ? activeSector.name : 'CUSTOM')} · L{levelIdx + 1}/{playlist.length || 1}
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => {
                setPlayMenu(false);
                engineRef.current?.setCalibrationFrozen(false);
              }}
            >
              Resume
            </button>
            <button type="button" className="btn-ghost" onClick={toggleMute}>
              {muted ? 'Audio off' : 'Audio on'}
            </button>
            <div className="settings-review" data-ui="true">
              <div className="ready-kicker">Review / development</div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (reviewMode) {
                    setReviewMode(false);
                    setReviewList(false);
                    return;
                  }
                  const levels = campaignReviewPlaylist();
                  const currentId = playlist[levelIdx]?.id;
                  const nextIndex = Math.max(0, levels.findIndex((level) => level.id === currentId));
                  setPlaylist(levels);
                  setLevelIdx(nextIndex === -1 ? 0 : nextIndex);
                  setActiveSector(sectorForCampaignLevel(levels[nextIndex === -1 ? 0 : nextIndex].id));
                  setReviewMode(true);
                }}
              >
                Review Mode {reviewMode ? 'On' : 'Off'}
              </button>
              {reviewMode && (
                <>
                  <div className="fine">{playlist[levelIdx]?.id} · {sectorForCampaignLevel(playlist[levelIdx]?.id ?? '')?.name}</div>
                  <button type="button" className="btn-ghost" onClick={() => stepReview(-1)}>Previous Level</button>
                  <button type="button" className="btn-ghost" onClick={() => stepReview(1)}>Next Level</button>
                  <button type="button" className="btn-ghost" onClick={() => setReviewList(true)}>Level Select</button>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn-secondary"
              data-calibrate="true"
              onClick={(e) => {
                e.stopPropagation();
                setPlayMenu(false);
                enterCalibration();
              }}
            >
              Visual calibration
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setPlayMenu(false);
                engineRef.current?.setCalibrationFrozen(false);
                engineRef.current?.cleanup();
                setScreen(activeSector ? 'campaign' : 'title');
              }}
            >
              Leave level
            </button>
          </div>
        </div>
      )}

      {/* ═══ CALIBRATION MODE — game stays visible, frozen ═══ */}
      {calibrationMode && (
        <>
          {/* Freeze badge — does not cover ATL center */}
          <div className="absolute pointer-events-none flex">
            <div>
              Calibration Mode · Frozen
            </div>
          </div>

          {/* Collapsed tab */}
          {calCollapsed ? (
            <button
              onClick={() => setCalCollapsed(false)}
              className="absolute"
            >
              Expand Controls
            </button>
          ) : (
            <div className="absolute overflow-y-auto">
              <div className="flex">
                <div>Visual Calibration</div>
                <div className="flex">
                  <button onClick={() => setCalDock('left')}>Left</button>
                  <button onClick={() => setCalDock('bottom')}>Bottom</button>
                  <button onClick={() => setCalDock('right')}>Right</button>
                  <button onClick={() => setCalCollapsed(true)}>Collapse</button>
                </div>
              </div>

              {/* Ambient Target */}
              <div>
                <div>Ambient Target</div>

                {/* Size */}
                <div>
                  <div className="flex">
                    <span>Size</span>
                    <span>{visualCal.ambientTarget.targetNumberScale.toFixed(2)}×</span>
                  </div>
                  <div className="flex">
                    <button type="button"
                      onClick={() => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberScale: visualCal.ambientTarget.targetNumberScale - 0.01 } })}>−</button>
                    <input type="range" min={0.5} max={2} step={0.01} className="flex-1"
                      value={visualCal.ambientTarget.targetNumberScale}
                      onChange={(e) => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberScale: parseFloat(e.target.value) } })} />
                    <button type="button"
                      onClick={() => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberScale: visualCal.ambientTarget.targetNumberScale + 0.01 } })}>+</button>
                  </div>
                </div>

                {/* Y */}
                <div>
                  <div className="flex">
                    <span>Position Y</span>
                    <span>{visualCal.ambientTarget.targetNumberOffsetY} px</span>
                  </div>
                  <div className="flex">
                    <button type="button"
                      onClick={() => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberOffsetY: visualCal.ambientTarget.targetNumberOffsetY - 1 } })}>−</button>
                    <input type="range" min={-200} max={200} step={1} className="flex-1"
                      value={visualCal.ambientTarget.targetNumberOffsetY}
                      onChange={(e) => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberOffsetY: parseInt(e.target.value, 10) } })} />
                    <button type="button"
                      onClick={() => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberOffsetY: visualCal.ambientTarget.targetNumberOffsetY + 1 } })}>+</button>
                  </div>
                </div>

                {/* Opacity */}
                <div>
                  <div className="flex">
                    <span>Opacity</span>
                    <span>{visualCal.ambientTarget.targetNumberOpacity.toFixed(2)}</span>
                  </div>
                  <div className="flex">
                    <button type="button"
                      onClick={() => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberOpacity: visualCal.ambientTarget.targetNumberOpacity - 0.01 } })}>−</button>
                    <input type="range" min={0.05} max={1} step={0.01} className="flex-1"
                      value={visualCal.ambientTarget.targetNumberOpacity}
                      onChange={(e) => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberOpacity: parseFloat(e.target.value) } })} />
                    <button type="button"
                      onClick={() => previewVisual({ ambientTarget: { ...visualCal.ambientTarget, targetNumberOpacity: visualCal.ambientTarget.targetNumberOpacity + 0.01 } })}>+</button>
                  </div>
                </div>
              </div>

              {/* Goal Indicator */}
              <div>
                <div>Goal Indicator</div>

                <div>
                  <div className="flex">
                    <span>Size</span>
                    <span>{visualCal.goalIndicator.scale.toFixed(2)}×</span>
                  </div>
                  <div className="flex">
                    <button type="button"
                      onClick={() => previewVisual({ goalIndicator: { ...visualCal.goalIndicator, scale: visualCal.goalIndicator.scale - 0.05 } })}>−</button>
                    <input type="range" min={0.5} max={4} step={0.05} className="flex-1"
                      value={visualCal.goalIndicator.scale}
                      onChange={(e) => previewVisual({ goalIndicator: { ...visualCal.goalIndicator, scale: parseFloat(e.target.value) } })} />
                    <button type="button"
                      onClick={() => previewVisual({ goalIndicator: { ...visualCal.goalIndicator, scale: visualCal.goalIndicator.scale + 0.05 } })}>+</button>
                  </div>
                </div>

                <div>
                  <div className="flex">
                    <span>Position Y</span>
                    <span>{visualCal.goalIndicator.offsetY} px</span>
                  </div>
                  <div className="flex">
                    <button type="button"
                      onClick={() => previewVisual({ goalIndicator: { ...visualCal.goalIndicator, offsetY: visualCal.goalIndicator.offsetY - 1 } })}>−</button>
                    <input type="range" min={-200} max={200} step={1} className="flex-1"
                      value={visualCal.goalIndicator.offsetY}
                      onChange={(e) => previewVisual({ goalIndicator: { ...visualCal.goalIndicator, offsetY: parseInt(e.target.value, 10) } })} />
                    <button type="button"
                      onClick={() => previewVisual({ goalIndicator: { ...visualCal.goalIndicator, offsetY: visualCal.goalIndicator.offsetY + 1 } })}>+</button>
                  </div>
                </div>
              </div>

              {importOpen && (
                <div>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder='Paste visual config JSON…'
                  />
                  <div className="flex">
                    <button onClick={handleImportConfig} className="flex-1">Import Preview</button>
                    <button onClick={() => setImportOpen(false)}>Close</button>
                  </div>
                </div>
              )}

              <div>
                <button onClick={applyCalibration}>Apply</button>
                <button onClick={() => exitCalibration(true)}>Cancel</button>
                <button onClick={handleResetToDefaults}>Reset</button>
              </div>
              <div>
                <button onClick={handleCopyConfig}>
                  {copyDone ? 'Copied!' : 'Copy Config'}
                </button>
                <button onClick={handleDownloadConfig}>Download</button>
              </div>
              <div>
                <button onClick={() => setImportOpen(true)}>Import Config</button>
                <button onClick={handleRestoreProduction}>Restore Production Defaults</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
