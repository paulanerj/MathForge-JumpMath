# JUMPMATH COMMERCIAL ARCHITECTURE PROGRAM
## ARCH-0: FORENSIC ARCHITECTURE AUDIT & TARGET DESIGN SPECIFICATION (R1)
**Status:** COMPLETE & FROZEN  
**Baseline Hash / Tag:** `JUMPMATH-R2-PHASE-4C-FROZEN`  
**Execution Context:** Forensic Systems Analysis & Clean-Architecture Target Modeling  
**Primary Directive:** ARCH-0 is forensic analysis and target architecture design only. Zero modifications to runtime gameplay, difficulty balancing, presentation, or contracts.

---

## EXECUTIVE SUMMARY

JumpMath has evolved through four major development phases (1A through 4C), achieving high-polish visual effects, campaign progression, sound synthesis, educational math challenges, plasma pursuit mechanics, and comprehensive automated test coverage across 8 authoritative suites.

However, forensic analysis reveals substantial architectural coupling across the current codebase:
1. **God-Object Coupling (`GameEngine.ts`):** 1,082 lines governing simulation physics, loop scheduling, direct canvas input coordinate transformation, math challenge resolution, state mutation, audio side effects, React UI callback synchronization, camera updates, visual effect triggering, and telemetry emission.
2. **Dual Representation of Entities:** Platforms and player state exist simultaneously as geometric data structures in `PlatformManager` and `GameEngine`, rendering primitives in `Renderer.ts`, hit bounds in `PlatformHitGeometry.ts`, and theme decorators in `realms.ts` and `worldDraw.ts`.
3. **Implicit Temporal Coupling:** Frame updates (`update(dt)`) intertwine fixed educational evaluation logic with variable frame-rate rendering and camera interpolation.
4. **Presentation & Simulation Interleaving:** Canvas drawing operations directly read mutable simulation state, occasionally executing side-effecting caching or fallback calculations during paint cycles.

The **Commercial Architecture Program** adopts the following immutable strategy:
$$\text{Freeze Reference Behavior} \longrightarrow \text{First-Principles Decoupled Architecture} \longrightarrow \text{Progressive Subsystem Migration} \longrightarrow \text{Parity-Gated Authority Transfer}$$

---

## PART 1 — COMPLETE PRODUCTION RUNTIME INVENTORY

### 1.1 Application Shell & Navigation
- **File(s):** `src/App.tsx`, `src/main.tsx`, `index.html`, `src/index.css`
- **Owner:** UI / Application Coordinator
- **State Read:** `screen` (`'title' | 'campaign' | 'ready' | 'playing' | 'gameover' | 'levelclear'`), `calibrationMode`, `playMenu`, `reviewMode`, `reviewUnlockAllLevels`, `audioMuted`, `telemetryEnabled`, `activeLevelIndex`.
- **State Written:** Screen transitions, modal visibility flags, local storage cache of volume and campaign progress.
- **Systems Called:** `GameEngine` lifecycle (`start()`, `pause()`, `cleanup()`, `reset()`), `DevelopmentTelemetry`, `SoundEngine` (`initAudio()`, `setMuted()`), `reviewMode` query parser, `visualCalibration`.
- **Systems Calling It:** React DOM runtime, browser event loops.
- **Side Effects:** DOM mutations, audio unlock on user gesture, localStorage writes.
- **Persistence:** LocalStorage keys: `jumpmath_campaign_progress`, `jumpmath_audio_muted`, `jumpmath_telemetry_enabled`, `jumpmath_visual_calibration`.
- **Player-Visible Responsibility:** Main menu, HUD overlays, pause/settings modal, level clear screens, sector selection carousel, calibration lab.
- **Test Coverage:** `tests/settings_interaction_suite.ts`, `tests/architecture_contract_suite.ts` (RA1–RA8, ST1–ST6).
- **Known Contracts:** RA1–RA8 (Review mode bypass), ST1–ST6 (Settings reachability).
- **Known Coupling:** Directly holds references to canvas DOM element, instantiates `GameEngine`, and passes direct closure callbacks for `onWin`, `onDeath`, and `onScore`.

### 1.2 Game Session Lifecycle & Simulation Loop
- **File(s):** `src/engine/GameEngine.ts`
- **Owner:** Core Engine Controller
- **State Read:** `GameState` (`zyx`, `platforms`, `wave`, `score`, `streak`, `status`, `schema`, `timeLeft`, `plasmaShield`, `plasmaFrozen`).
- **State Written:** Complete `GameState` on every tick (`requestAnimationFrame`).
- **Systems Called:** `PlatformManager`, `MathChallengeEngine`, `Camera`, `Renderer`, `SoundEngine`, `DevelopmentTelemetry`, `PlatformHitGeometry`.
- **Systems Calling It:** `App.tsx` (via React lifecycle effects).
- **Side Effects:** Direct Canvas 2D context manipulation, window event listener binding, high-frequency telemetry event emission.
- **Persistence:** None (transient session state).
- **Player-Visible Responsibility:** Orchestration of the 60fps simulation, jumps, bounces, timer countdown, death transitions, and win triggers.
- **Test Coverage:** `tests/architecture_contract_suite.ts`, `tests/player_path_suite.ts`, `tests/torture_suite.ts`.
- **Known Contracts:** PV1–PV8, PP1–PP10, CI1–CI12, MC1–MC11.
- **Known Coupling:** Tightly coupled to DOM `HTMLCanvasElement`, browser `performance.now()`, and DOM pointer events.

### 1.3 Player (Zyx) Mechanics & State Machine
- **File(s):** `src/engine/GameEngine.ts` (lines 80–120, 310–480), `src/types.ts`
- **Owner:** Player Simulation Model
- **State Read:** Current row index, platform positions, target coordinates, jump parabola parameters ($t \in [0, 1]$), stretch/squash factors ($sx, sy, rot$).
- **State Written:** `zyx.x`, `zyx.y`, `zyx.sx`, `zyx.sy`, `zyx.rot`, `zyx.currentRow`, `zyx.jumping`, `zyx.bouncing`, `zyx.falling`.
- **Systems Called:** `SoundEngine` (`playZyxJump`, `playZyxLand`, `playWrongBounce`), `MorticianAPI` (on death).
- **Systems Calling It:** `GameEngine.update()`.
- **Side Effects:** Telemetry events (`player_jump_started`, `correct_platform_landed`, `wrong_platform_landed`).
- **Persistence:** None.
- **Player-Visible Responsibility:** Mascot animation, trajectory motion along progression vectors, squash & stretch on impact.
- **Test Coverage:** `tests/player_path_suite.ts`, `tests/torture_suite.ts`.
- **Known Contracts:** PV5, PP6.
- **Known Coupling:** Motion trajectory is tightly bound to `platformManager.gapY` and `progressionVector`.

### 1.4 Platforms & Platform Manager
- **File(s):** `src/engine/PlatformManager.ts`, `src/engine/PlatformHitGeometry.ts`, `src/types.ts`
- **Owner:** Platform Layout & Geometry Subsystem
- **State Read:** `LevelSchema` (`gridWidth`, `gapX`, `gapY`, `progressionVector`, `maxRows`, `theme`), `MathChallengeEngine` options.
- **State Written:** Array of `Platform` objects (`id`, `x`, `y`, `rowIdx`, `val`, `isCorrect`, `challengeId`, `optionId`, `shattered`, `selected`).
- **Systems Called:** `MathChallengeEngine.getChallengeForLookaheadRow()`, `realmForLevel()`.
- **Systems Calling It:** `GameEngine`, `Renderer`.
- **Side Effects:** Lookahead generation of rows 1..N.
- **Persistence:** None.
- **Player-Visible Responsibility:** Stepping stone layout, spacing, shattering animation state, label positioning.
- **Test Coverage:** `tests/challenge_trace_suite.ts`, `tests/math_challenge_suite.ts` (MC5).
- **Known Contracts:** MC5 (PlatformManager must be arithmetic-ignorant), MC8, MC11.
- **Known Coupling:** `PlatformManager` directly references `MathChallengeEngine` to bind option values to platform slots.

### 1.5 Input & Platform Hit Geometry
- **File(s):** `src/engine/PlatformHitGeometry.ts`, `src/engine/GameEngine.ts` (lines 160–235)
- **Owner:** Input & Hit Testing Authority
- **State Read:** Pointer client coordinates (`clientX`, `clientY`), canvas bounding client rect, canvas internal resolution (`width`, `height`), camera offset (`camera.x`, `camera.y`), platform positions, realm shape definitions.
- **State Written:** Platform selection trigger, jump execution.
- **Systems Called:** `clientToCanvasCoords()`, `testPlatformHit()`, `resolvePlatformSelection()`.
- **Systems Calling It:** Canvas DOM listeners (`pointerdown`, `mousedown`, `touchstart`).
- **Side Effects:** Dispatches player jump or records miss telemetry.
- **Persistence:** None.
- **Player-Visible Responsibility:** Responsive selection when clicking anywhere inside the visible platform body.
- **Test Coverage:** `tests/player_path_suite.ts`, `tests/torture_suite.ts`.
- **Known Contracts:** PF1–PF12 (Visual Platform = Minimum Interaction Geometry, deterministic overlap tie-breaker).
- **Known Coupling:** Depends on DOM `getBoundingClientRect()` and CSS `object-fit: contain` letterboxing metrics.

### 1.6 Camera & Actionable-Row Framing
- **File(s):** `src/engine/Camera.ts`, `src/engine/GameEngine.ts` (lines 236–310, 898–925)
- **Owner:** Viewport Tracking Authority
- **State Read:** Player position (`zyx.x`, `zyx.y`), progression vector, row spacing (`gapY`), jump progress $t$.
- **State Written:** `camera.x`, `camera.y`.
- **Systems Called:** `telemetry.recordEvent('PLATFORM', 'actionable_row_evaluated')`.
- **Systems Calling It:** `GameEngine.update()`.
- **Side Effects:** Telemetry logging of viewport bounds and clipping warnings.
- **Persistence:** None.
- **Player-Visible Responsibility:** Smooth lerp tracking keeping player in the lower third; horizontal tracking along diagonal progression routes ensuring both the support row and the actionable next row remain visually legible.
- **Test Coverage:** `tests/player_path_suite.ts` (Framing contracts), `tests/architecture_contract_suite.ts` (PP5, AM, AQ).
- **Known Contracts:** PP5, AM, AQ, Actionable-Row Framing Invariant.
- **Known Coupling:** Directly manipulates world-to-camera matrix values consumed by `Renderer`.

### 1.7 Renderer & Visual Presentation
- **File(s):** `src/engine/Renderer.ts`, `src/engine/plasmaPresentation.ts`, `src/visual/realms.ts`, `src/visual/worldDraw.ts`
- **Owner:** Visual Rendering Subsystem
- **State Read:** Canvas 2D context, `GameState`, `Camera`, `VisualCalibrationConfig`, `PlasmaPresentation`, `RealmSpec`.
- **State Written:** Canvas buffer pixels, internal cache objects (`lastPlasma`).
- **Systems Called:** HTML5 Canvas 2D rendering APIs (`ctx.arc`, `ctx.roundRect`, `ctx.createLinearGradient`, `ctx.stroke`, `ctx.fill`).
- **Systems Calling It:** `GameEngine.draw()`.
- **Side Effects:** GPU/Canvas draw calls.
- **Persistence:** None.
- **Player-Visible Responsibility:** Background nebulae, stars, platform geometry, glow shaders, text rendering, particle bursts, plasma wave shock front.
- **Test Coverage:** `tests/architecture_contract_suite.ts` (PP1–PP10), headless canvas mock suite.
- **Known Contracts:** PP1–PP10, CI8.
- **Known Coupling:** Tightly coupled to mutable `GameEngine.state` and browser DOM canvas.

### 1.8 Educational Math Engine & Challenge Generation
- **File(s):** `src/math/MathChallengeEngine.ts`, `src/math/MathModeRegistry.ts`, `src/math/MathRng.ts`, `src/math/modes/*`, `src/math/distractors/*`, `src/math/objectivePresentation.ts`
- **Owner:** Pedagogical Mathematics Authority
- **State Read:** `LevelSchema` (`mathConfig`, `mode`), seed, learner sequence state.
- **State Written:** Authoritative `MathChallenge` objects (`id`, `prompt`, `correctAnswer`, `options`, `pedagogicalIntent`).
- **Systems Called:** Mode generators (`SumToMode`, `DifferenceMode`, `MultiplyMode`, `SkipCountMode`), Distractor models (`AdditiveCloseDecoy`, `MultiplicationTableDecoy`, `OffByOneDecoy`).
- **Systems Calling It:** `PlatformManager.generateRow()`, `GameEngine.executeJump()`.
- **Side Effects:** Monotonic progression of deterministic RNG.
- **Persistence:** None.
- **Player-Visible Responsibility:** Math equation prompt displayed on the HUD, number values displayed on platforms.
- **Test Coverage:** `tests/math_challenge_suite.ts`, `tests/challenge_trace_suite.ts`.
- **Known Contracts:** MB1–MB10 (Distractor generation, uniqueness, boundary contracts), MC1–MC11 (Authority, lookahead immutability, idempotency).
- **Known Coupling:** Pristine decoupling achieved in Phase 3B; clean interface consumed via `MathModeRegistry`.

### 1.9 Plasma Pursuit Simulation & Presentation
- **File(s):** `src/engine/plasmaPresentation.ts`, `src/engine/GameEngine.ts` (lines 800–890), `src/config/defaults.ts`
- **Owner:** Hazard Physics & Presentation Authority
- **State Read:** `wave.y`, `wave.speed`, `camera.y`, canvas height, `visualCalibration`.
- **State Written:** `wave.y` in world space, `PlasmaPresentation` data structure.
- **Systems Called:** `derivePlasmaPresentation()`.
- **Systems Calling It:** `GameEngine.update()`, `Renderer.paintPlasmaWall()`.
- **Side Effects:** Collision detection against player, triggering death sequence.
- **Persistence:** Staged config in settings modal.
- **Player-Visible Responsibility:** Ominous glowing plasma shock front advancing from the bottom of the screen, warning sirens, particle embers.
- **Test Coverage:** `tests/architecture_contract_suite.ts` (PV1–PV8, PP1–PP10).
- **Known Contracts:** PV1–PV8, PP1–PP10, AL, AN, AO, AP.
- **Known Coupling:** Physical calculation is in `GameEngine.ts`, visual projection in `plasmaPresentation.ts`, drawing in `Renderer.ts`.

### 1.10 Audio & Procedural Sound Synthesis
- **File(s):** `src/audio/SoundEngine.ts`, `src/audio/soundLanguage.ts`, `src/audio/soundManifest.ts`
- **Owner:** Procedural Web Audio Authority
- **State Read:** Web Audio `AudioContext`, sound toggle (`muted`), master gain.
- **State Written:** Audio nodes, oscillator frequencies, envelope gains.
- **Systems Called:** Web Audio API (`AudioContext`, `GainNode`, `OscillatorNode`, `AudioBufferSourceNode`).
- **Systems Calling It:** `GameEngine`, `App.tsx`.
- **Side Effects:** Acoustic output via system audio device.
- **Persistence:** Mute state in localStorage.
- **Player-Visible Responsibility:** Jump swooshes, platform bounce thuds, correct chime, wrong buzz, plasma warning hum, sector completion fanfare.
- **Test Coverage:** `tests/architecture_contract_suite.ts` (Contract H, Contract U).
- **Known Contracts:** Audio Contract H, Audio Contract U.
- **Known Coupling:** Requires user interaction gesture to unlock `AudioContext`.

### 1.11 Campaign, Sectors & Progression
- **File(s):** `src/engine/LevelDatabase.ts`, `src/review/reviewMode.ts`, `src/types.ts`
- **Owner:** Progression & Level Content Database
- **State Read:** 30 authoritative level definitions across 6 sectors; local storage progress.
- **State Written:** Cleared sectors array, best scores.
- **Systems Called:** `canSelectCampaignLevel()`, `canSelectCampaignSector()`.
- **Systems Calling It:** `App.tsx`, `GameEngine`.
- **Side Effects:** Unlocking subsequent sectors upon completion of Sector Level 5.
- **Persistence:** `jumpmath_campaign_progress` in localStorage.
- **Player-Visible Responsibility:** Sector selection map, level metadata (target number, mode title, difficulty rating).
- **Test Coverage:** `tests/architecture_contract_suite.ts` (CI1–CI12, RA1–RA8), `tests/config_authority_suite.ts`.
- **Known Contracts:** CI1–CI12, RA1–RA8.
- **Known Coupling:** Level schemas contain embedded visual, mathematical, and physical configs in a unified JSON structure.

### 1.12 Observability, Telemetry & Diagnostics
- **File(s):** `src/debug/DevelopmentTelemetry.ts`, `src/evidence/challengeTrace.ts`
- **Owner:** Diagnostic & Evidence Framework
- **State Read:** System events, errors, performance timings, engine state snapshots.
- **State Written:** Bounded ring buffer of 3,000 structured events; error log buffer.
- **Systems Called:** `console.log` (when enabled), `navigator.clipboard`.
- **Systems Calling It:** Every production subsystem (`INPUT`, `PLATFORM`, `PLAYER`, `WAVE`, `LEVEL`, `MATH`, `SETTINGS`, `REVIEW`).
- **Side Effects:** In-memory event collection, JSON report export.
- **Persistence:** Ring buffer in heap memory.
- **Player-Visible Responsibility:** Telemetry export button in settings modal, diagnostic copy button.
- **Test Coverage:** `tests/architecture_contract_suite.ts` (ST7–ST12), `tests/challenge_trace_suite.ts`.
- **Known Contracts:** ST7–ST12.
- **Known Coupling:** Strictly observational; cannot mutate simulation state or influence gameplay logic (Contract ST7).

---

## PART 2 — SUBSYSTEM DEPENDENCY GRAPH & COUPLING AUDIT

```
+-------------------------------------------------------------------------+
|                                App.tsx                                  |
|  (UI Shell, React State, Navigation, Settings Modal, Modal Overlays)    |
+-------------------------------------------------------------------------+
        |                  |                       |              |
        v                  v                       v              v
+---------------+  +----------------+      +---------------+  +-------------+
| SoundEngine   |  | LevelDatabase  |      | Telemetry     |  | reviewMode  |
+---------------+  +----------------+      +---------------+  +-------------+
        ^                  |                       ^              ^
        |                  v                       |              |
+-------------------------------------------------------------------------+
|                              GameEngine                                 |
|  (God Object: Loop, Physics, Jump State, Wave Pursuit, Input Handler)  |
+-------------------------------------------------------------------------+
    |         |               |                 |              |
    v         v               v                 v              v
+--------+ +-------------+ +-----------------+ +----------+ +-------------+
| Camera | | PlatformMgr | | MathChallengeEng| | HitGeom  | | Renderer    |
+--------+ +-------------+ +-----------------+ +----------+ +-------------+
                 |                 |                           |
                 v                 v                           v
           +-------------+  +---------------+           +---------------+
           | LevelSchema |  | Modes/Registry|           | worldDraw     |
           +-------------+  +---------------+           +---------------+
                                                               |
                                                               v
                                                        +---------------+
                                                        | realms        |
                                                        +---------------+
```

### Coupling Classification

1. **Import Coupling:**
   - `GameEngine` imports 11 distinct subsystem modules directly.
   - `Renderer` imports `realms`, `worldDraw`, and `plasmaPresentation`.
   - `PlatformManager` imports `MathChallengeEngine` and `realms`.
2. **State Coupling:**
   - `Renderer` directly inspects mutable references to `engine.state.zyx`, `engine.state.wave`, `engine.state.platforms`.
   - `GameEngine` mutates `camera.x` and `camera.y` directly in addition to calling `camera.update()`.
   - `App.tsx` directly reads `engine.state.status` and `engine.state.score` via callback triggers.
3. **Control-Flow Coupling:**
   - The game loop (`requestAnimationFrame`) in `GameEngine` directly drives input polling, state advancement, camera interpolation, lookahead platform generation, and canvas repainting in a single synchronous block.
4. **Temporal Coupling:**
   - Platform hit detection requires the camera to have updated for the *current* frame, but before the render pass clears the buffer.
   - Lookahead challenge generation must precede platform position calculation.
5. **Data-Shape Coupling:**
   - `Platform` interface binds visual geometry (`x, y, w, h`), math challenge references (`challengeId, optionId, val`), and gameplay state (`shattered, selected`) into a single record.
6. **Presentation Coupling:**
   - Platform hit geometry in `PlatformHitGeometry.ts` duplicates numerical constants from `Renderer.ts` (`VISUAL_PLATFORM_HW = 64`, lobe dimensions, slant angles) to ensure hit testing mirrors visual rendering.

---

## PART 3 — CHANGE-BLAST-RADIUS AUDIT

| Change Scenario | Subsystems Touched | Files Requiring Edits | Regression Risk & Verification Required |
| :--- | :--- | :--- | :--- |
| **A. Platform Hit Geometry** | Input, Geometry, Telemetry | `PlatformHitGeometry.ts`, `GameEngine.ts` | High: Risk of breaking touch selection, overlap resolution, or mobile tolerance. Requires `player_path_suite.ts`. |
| **B. Platform Appearance** | Renderer, Themes, Hit Geometry | `realms.ts`, `worldDraw.ts`, `PlatformHitGeometry.ts` | Critical: Visual changes can desynchronize visual bounds from hit geometry without dual-updating `PlatformHitGeometry.ts`. |
| **C. Camera Look-Ahead** | Camera, Framing, Input | `Camera.ts`, `GameEngine.ts` | High: Affects screen-to-world input unprojection and actionable-row visibility contracts. |
| **D. Diagonal Row Framing** | Viewport Framing, Camera | `GameEngine.ts`, `Camera.ts` | Moderate: Risk of clipping outer platform options on diagonal trajectories (Level 21–25). |
| **E. Plasma Speed / Pursuit** | Physics, Config, Balance | `LevelDatabase.ts`, `zyxConfig.ts`, `defaults.ts` | High: Can cause early-play wave collisions, violating PV1 and PV2 contracts. |
| **F. Plasma Appearance** | Plasma Presentation, Shaders | `plasmaPresentation.ts`, `Renderer.ts` | Low-Moderate: Gated by PP1–PP10 visual freeze contracts. |
| **G. Death / Recovery Behavior** | Lifecycle, State Machine, Wave | `GameEngine.ts`, `plasmaPresentation.ts` | High: Affects wave recovery gap, shield immunity window, and PV6/PP7 contracts. |
| **H. Settings UI** | React Shell, Diagnostics | `App.tsx`, `DevelopmentTelemetry.ts` | Moderate: Must maintain ST1–ST12 modal reachability and focus-trap safety across all screens. |
| **I. Campaign Unlock Behavior** | Progression, Database, Review | `LevelDatabase.ts`, `reviewMode.ts`, `App.tsx` | High: Risk of mutating persistent progress during review mode exploration (violating RA3). |
| **J. Add a New Math Mode** | Math Mode Registry, Factory | `src/math/modes/*`, `MathModeRegistry.ts` | Minimal: Cleanly decoupled via Phase 3B registry. Zero edits to `GameEngine` or `Renderer`. |
| **K. Add New Audio Cue** | Sound Engine, Audio Manifest | `soundManifest.ts`, `SoundEngine.ts`, `GameEngine.ts` | Low: Protected by Contract H and Contract U. |
| **L. Headless Test Execution** | Toolchain, Mock DOM | `mock_env.ts`, `run-tests.mjs` | Low-Moderate: Requires headless Canvas, DOM rects, and Web Audio stubs. |

---

## PART 4 — EXISTING CONTRACT INVENTORY & VERIFICATION MATRIX

| Contract Family | Contract IDs | Description & Domain | Reference Authority | Current Implementation Authority | Verification Suite | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Plasma Physics** | PV1–PV8 | Physical wave speed, entrance delay, world Y authority, pursuit advancement, death recovery gap, lab isolation | Phase 4B Specification | `GameEngine.ts`, `plasmaPresentation.ts` | `architecture_contract_suite.ts` | **PASS** |
| **Plasma Presentation** | PP1–PP10 | Single crest authority, canonical screen projection, offscreen discipline, camera independence, mobile bounds | Phase 4B Freeze | `plasmaPresentation.ts`, `Renderer.ts` | `architecture_contract_suite.ts` | **PASS** |
| **Campaign Integration** | CI1–CI12 | Sector progression, level ordering, math difficulty curves, deterministic reproducibility, 30-level traversal smoke | Phase 4C Specification | `LevelDatabase.ts`, `GameEngine.ts` | `architecture_contract_suite.ts` | **PASS** |
| **Review Access** | RA1–RA8 | Review mode lock bypass, progression mutation guards, URL query param activation, direct level review | Phase 4C Specification | `reviewMode.ts`, `App.tsx` | `architecture_contract_suite.ts` | **PASS** |
| **Settings & Telemetry** | ST1–ST12 | Modal reachability across screens, observational telemetry invariants, monotonic seq, error buffering, data export | Phase 4C Specification | `DevelopmentTelemetry.ts`, `App.tsx` | `architecture_contract_suite.ts`, `settings_interaction_suite.ts` | **PASS** |
| **Platform Hit & Framing**| PF1–PF12 | Visual body = interaction geometry, shape-specific hit tests, touch tolerance, deterministic tie-breaking, row framing | Phase 4C-R3 Spec | `PlatformHitGeometry.ts`, `GameEngine.ts` | `player_path_suite.ts`, `torture_suite.ts` | **PASS** |
| **Math Generation** | MB1–MB10 | Distractor models, option uniqueness, strict domain boundaries, deterministic seeds, prompt contracts | Phase 3B Specification | `MathChallengeEngine.ts`, `MathModeRegistry.ts` | `math_challenge_suite.ts` | **PASS** |
| **Math Engine Lifecycle** | MC1–MC11 | Single correct answer, lookahead immutability, double-commit protection, out-of-order protection, arithmetic-ignorant manager | Phase 3B Specification | `MathChallengeEngine.ts`, `PlatformManager.ts` | `math_challenge_suite.ts`, `challenge_trace_suite.ts` | **PASS** |
| **Configuration Authority**| CF1–CF12 | Typed configuration overrides, visual calibration persistence, immutable default fallbacks | Phase 2A Specification | `src/config/*` | `config_authority_suite.ts` | **PASS** |

---

## PART 5 — TARGET COMMERCIAL ARCHITECTURE (FIRST PRINCIPLES)

The target commercial architecture decomposes the monolithic game engine into six independent, decoupled architectural layers:

```
+------------------------------------------------------------------------------------+
|                                    APPLICATION                                     |
|  React UI, HUD, Modals, Responsive Canvas Viewport, Accessibility, User Settings   |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
|                                GAME ORCHESTRATION                                  |
|   Session Lifecycle, Scene Transitions, Pause/Resume, Mode Swapping, Diagnostics   |
+------------------------------------------------------------------------------------+
       |                                   |                                   |
       v                                   v                                   v
+---------------+                 +-----------------+                 +--------------+
| INPUT DOMAIN  |                 | SIMULATION CORE |                 | AUDIO DOMAIN |
| Screen Unproj |                 | Deterministic   |                 | Event-Driven |
| Hit-Testing   |                 | Fixed-Tick (60) |                 | Sound Synth  |
| Gesture Recog |                 | Pure State      |                 | Web Audio    |
+---------------+                 +-----------------+                 +--------------+
       |                                   |                                   |
       +-------------------+               |               +-------------------+
                           |               |               |
                           v               v               v
+------------------------------------------------------------------------------------+
|                               EVENT DISPATCH BUS                                   |
|   `JumpTriggered`, `PlatformLanded`, `AnswerResolved`, `HazardCollided`, etc.      |
+------------------------------------------------------------------------------------+
                                         |
                                         v
+------------------------------------------------------------------------------------+
|                                RENDERING DOMAIN                                    |
|   Stateless Frame Interpolation, Canvas 2D / WebGL Primitives, Visual Shaders      |
+------------------------------------------------------------------------------------+
```

### Core Architecture Principles

1. **State / Presentation Boundary:**
   The simulation core (`SimulationEngine`) contains **zero** references to DOM elements, Canvas 2D contexts, Web Audio nodes, or CSS pixels. The simulation operates strictly on mathematical coordinates and discrete ticks.
2. **Deterministic Simulation Core:**
   The game simulation updates in fixed $16.666\text{ms}$ ticks ($\Delta t = 1/60\text{s}$). All state mutations (player kinematics, platform state transitions, wave advancement) are deterministic functions of `(PreviousState, Inputs, Seed) -> NextState`.
3. **Stateless Visual Rendering Pipeline:**
   The renderer receives an immutable `RenderSceneSnapshot` (interpolated between previous and current simulation ticks) and executes draw calls. It owns no simulation state and performs no simulation calculations.
4. **Decoupled Hit-Test Authority:**
   Hit geometry is defined by canonical mathematical shape descriptors (`PlatformGeometrySpec`). Both the simulation hit-tester and the visual renderer consume the **same** shared geometry spec, eliminating duplicated dimensions and visual desynchronization.
5. **Event-Driven Audio & Telemetry:**
   Audio playback and telemetry recording listen to domain events (`PlatformLandedEvent`, `DeathTriggeredEvent`) emitted via an event bus. The simulation core never invokes audio methods directly.
6. **Headless Execution by Design:**
   Every gameplay system can run in pure Node.js environments without DOM, canvas, or Web Audio mocks, enabling high-performance property testing, AI bot balancing, and regression verification.

---

## PART 6 — PROGRESSIVE MIGRATION STRATEGY

To preserve 100% of proven gameplay behavior and prevent commercial regression, migration proceeds through discrete, parity-verified phases:

```
ARCH-0: Forensic Architecture Audit & Target Design (COMPLETE)
   |
   v
ARCH-1: Shared Types, Domain Events & Canonical Geometry Contracts
   |
   v
ARCH-2: Decoupled Deterministic Simulation Engine & State Machine
   |
   v
ARCH-3: Stateless Visual Renderer & Camera Projection Pipeline
   |
   v
ARCH-4: Event-Driven Audio, Telemetry & Input Coordinator Migration
   |
   v
ARCH-5: Application Shell Integration & Dual-Engine Parity Verification
   |
   v
ARCH-6: Full Authority Transfer & Legacy Engine Retirement
```

### Verification & Fallback Protocol
- **Dual-Run Verification:** During ARCH-5, an automated test harness runs the legacy `GameEngine` and the new `DeterministicSimulationEngine` in parallel with identical input sequences, asserting byte-for-byte coordinate and outcome parity.
- **Safety Fallback:** The legacy runtime remains fully intact in the repository until ARCH-6 parity certification is signed off.
- **Zero-Regression Invariant:** Every phase must execute and pass all 8 authoritative suites (`architecture_contract_suite.ts`, `challenge_trace_suite.ts`, `math_challenge_suite.ts`, `config_authority_suite.ts`, `player_path_suite.ts`, `torture_suite.ts`, `settings_interaction_suite.ts`) before code can be merged.

---

## PART 7 — ARCH-0 VERIFICATION & FREEZE RECOMMENDATION

### Verification Audit Summary
- **TypeScript Static Compilation:** Clean (`tsc --noEmit` exited 0).
- **Vite Production Bundler:** Clean (`vite build` completed successfully).
- **Authoritative Contract Test Matrix:** 100% passing across all 8 test suites.
- **Runtime Integrity:** Zero behavioral regressions introduced.

### Recommendation
**PROCEED TO ARCH-1.**  
The JumpMath R2 runtime behavior is completely cataloged, understood, and frozen. The baseline authority is established. Subsequent phases may begin formal extraction of the clean commercial architecture under the progressive migration protocol.
