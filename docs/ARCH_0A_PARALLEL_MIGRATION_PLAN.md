# JUMPMATH COMMERCIAL ARCHITECTURE PROGRAM
## ARCH-0A: PARALLEL WORKSTREAM PLAN & REVISED MIGRATION ROADMAP
**Status:** APPROVED FOR COMMERCIAL MIGRATION  
**Primary Integration Authority:** JumpMath Architecture Integration Thread  
**Directives:** No production source modifications. No early subsystem replacement. Zero unverified authority transfer.

---

## 1. GOVERNANCE & MULTI-AGENT DEVELOPMENT MODEL

To accelerate commercialization without compromising the integrity of JumpMath's proven gameplay, presentation, and math learning behavior, development is partitioned into a **Single Integration Authority** and **Five Specialist Workstream Lanes**.

```
+---------------------------------------------------------------------------------------+
|                    PRIMARY INTEGRATION AUTHORITY (Single Gatekeeper)                  |
|     Maintains Authoritative SOT, Conducts Parity Certification, Executes Merges       |
+---------------------------------------------------------------------------------------+
          ^                       ^                       ^                  ^
          | Promotes              | Promotes              | Promotes         | Promotes
+--------------------+  +--------------------+  +--------------------+  +---------------+
|  LANE A: GEOMETRY  |  |  LANE B: PURE SIM  |  |  LANE C: RENDER /  |  | LANE D: MOBILE|
|      & INPUT       |  |   & STATE CORE     |  |       CAMERA       |  |  & PERFORMANCE|
+--------------------+  +--------------------+  +--------------------+  +---------------+
          \                       |                       /                  /
           \                      |                      /                  /
            v                     v                     v                  v
+---------------------------------------------------------------------------------------+
|                LANE E: CHARACTERIZATION, PARITY HARNESS & VERIFICATION                |
|      (Continuous Characterization, Oracle Recording, Regression Interception)         |
+---------------------------------------------------------------------------------------+
```

### Core Operating Rules
1. **Integration Authority Monopoly:** Only the primary integration thread may touch authoritative production runtime paths (`src/engine/*`, `src/App.tsx`, `src/math/*`). Specialist lanes operate strictly within prototypes (`src/commercial/*`), tests (`tests/*`), and design specifications (`docs/*`).
2. **Early Parity Infrastructure:** Characterization and automated parity verification machinery (Lane E) must be fully established in **ARCH-1**, *before* any subsystem replacement occurs.
3. **No Defect Preservation:** Known historical bugs (such as text-only platform hitboxes or diagonal row viewport clipping) are explicitly excluded from parity matching. The reference authority is the *accepted player-facing contract*, not incidental implementation bugs.
4. **Promotion by Proof:** A subsystem can only be promoted when Lane E issues an automated **Zero-Regression & Contract Parity Certificate**.

---

## 2. SPECIALIST WORKSTREAM LANES

---

### LANE A — GEOMETRY & INPUT

#### 1. Exact Source Files to Inspect
- `src/engine/PlatformHitGeometry.ts`
- `src/engine/PlatformManager.ts`
- `src/engine/Camera.ts`
- `src/engine/Renderer.ts` (specifically `paintPlatform`, `VISUAL_PLATFORM_HW`, lobe dimensions)
- `src/visual/realms.ts` (shape definitions: `'slab'`, `'disc'`, `'ring'`, `'hex'`, `'narrow'`, `'split'`)
- `src/visual/worldDraw.ts`
- `src/engine/GameEngine.ts` (lines 160–235, pointer down / touch event handling)

#### 2. Behavioral Contracts to Preserve
- **PF1–PF8:** Platform Visual Body = Minimum Interaction Geometry invariant.
- Every visible pixel of an active platform must trigger selection. Text bounds must not participate in or restrict the hitbox.
- Modest centralized touch tolerance (baseline 8px in world space) for mobile accessibility.
- Deterministic overlap resolution: Visual-body containment strictly takes precedence over tolerance-only containment; distance to center is secondary; platform ID is tertiary tie-breaker.
- Coordinate unprojection authority: Client coordinates $\to$ canvas local coordinates $\to$ world coordinates with exact letterboxing/scaling compensation (`object-fit: contain`).

#### 3. Questions to Answer
- How can canonical geometry specifications be shared between the hit-test engine and the visual renderer without duplicating magic constants?
- How do non-affine platform transformations (such as bounce squash/stretch or future perspective tilt) impact hit boundary calculation?
- How should multi-touch gesture conflicts (pan vs. tap) be rejected deterministically?

#### 4. Artifacts to Produce
- `docs/specs/CANONICAL_GEOMETRY_SPEC.md`
- `src/commercial/geometry/PlatformGeometryAuthority.ts` (prototype)
- `src/commercial/input/InputUnprojector.ts` (prototype)
- `tests/commercial/geometry_hit_characterization_suite.ts`

#### 5. Interfaces to Propose
```typescript
export interface CanonicalPlatformGeometry {
  shapeId: 'slab' | 'disc' | 'ring' | 'hex' | 'narrow' | 'split';
  worldCenter: { x: number; y: number };
  extents: { width: number; height: number };
  containsPoint(worldPoint: { x: number; y: number }, tolerance: number): HitContainmentResult;
  getVisualPath2D(): Path2D; // Shared with renderer
}
```

#### 6. Files it May Prototype
- `src/commercial/geometry/*`
- `src/commercial/input/*`
- `tests/commercial/geometry/*`

#### 7. Files it Must NOT Modify
- `src/engine/*`
- `src/App.tsx`
- `src/math/*`
- `src/visual/*`

#### 8. Dependencies on Other Lanes
- Dependent on **Lane E** for reference hit-test trace vectors.
- Interfaces with **Lane C** for shared `Path2D` / drawing bounds.
- Feeds into **Lane B** for player jump targeting.

#### 9. Evidence Required Before Integration
- 10,000 randomized synthetic pointer tests proving 100% containment agreement between visual fill paths and hit regions across all 6 platform shapes.
- Automated verification of zero ambiguous multi-platform selections under expanded touch tolerances.

#### 10. Integration Owner
Integration Authority (Geometry & Input Lead)

#### 11. Promotion Gate
**Gate G-A (ARCH-3):** Passing all PF1–PF8 contracts + characterization hit-test parity test suite.

#### 12. Rollback Strategy
Revert `PlatformHitGeometry` delegation back to reference implementation in `src/engine/PlatformHitGeometry.ts`.

---

### LANE B — DETERMINISTIC SIMULATION & SESSION STATE

#### 1. Exact Source Files to Inspect
- `src/engine/GameEngine.ts` (lines 1–160, 310–550, 780–950)
- `src/types.ts` (`GameState`, `ZyxState`, `WaveState`, `Platform`, `LevelSchema`)
- `src/config/configTypes.ts`, `src/config/defaults.ts`, `src/config/zyxConfig.ts`
- `src/math/MathChallengeEngine.ts`
- `src/engine/LevelDatabase.ts`

#### 2. Behavioral Contracts to Preserve
- **PV1–PV8:** Plasma pursuit physics, entrance delays, deterministic advancement rates, world-Y authority, death recovery gaps, plasma shield duration.
- **CI1–CI12:** Campaign ordering, mathematical difficulty scaling, level initialization invariants.
- **MC1–MC11:** Single correct answer authority, lookahead immutability, double-commit protection, out-of-order resolution prevention.
- Jump trajectory physics: Parabolic kinematic pathing, launch/flight/landing squashing, bounce restitution.

#### 3. Questions to Answer
- How to isolate simulation ticks cleanly from `requestAnimationFrame` and DOM clocks into a pure $60\text{Hz}$ fixed-timestep loop?
- How to structure `GameState` as a pure, serializable value object without circular references or closure state?
- How to represent player death, wrong-answer bounce, and level completion as discrete finite-state transitions?

#### 4. Artifacts to Produce
- `docs/specs/DETERMINISTIC_SIMULATION_SPEC.md`
- `src/commercial/simulation/DeterministicSimulationEngine.ts` (prototype)
- `src/commercial/simulation/SessionStateMachine.ts` (prototype)
- `src/commercial/simulation/KinematicSolver.ts` (prototype)
- `tests/commercial/simulation_parity_suite.ts`

#### 5. Interfaces to Propose
```typescript
export interface SimulationTickInput {
  tick: number;
  dt: number; // strictly 1/60
  actions: PlayerAction[];
  randomSeed: number;
}

export interface SimulationDomainEvent {
  type: 'JUMP_STARTED' | 'PLATFORM_LANDED' | 'ANSWER_COMMITTED' | 'WAVE_COLLIDED' | 'LEVEL_COMPLETED';
  tick: number;
  payload: Record<string, unknown>;
}

export interface PureSimulationState {
  tick: number;
  zyx: Readonly<ZyxKinematicState>;
  wave: Readonly<WaveKinematicState>;
  platforms: ReadonlyArray<PlatformEntityState>;
  status: 'READY' | 'PLAYING' | 'BOUNCING' | 'DYING' | 'RECOVERING' | 'LEVEL_CLEAR';
  score: number;
  comboStreak: number;
  timeLeft: number;
}
```

#### 6. Files it May Prototype
- `src/commercial/simulation/*`
- `src/commercial/state/*`
- `tests/commercial/simulation/*`

#### 7. Files it Must NOT Modify
- `src/engine/*`
- `src/App.tsx`
- `src/audio/*`
- `src/debug/*`

#### 8. Dependencies on Other Lanes
- Depends on **Lane E** for tick-by-tick reference state traces.
- Feeds into **Lane C** for renderable frame snapshots.
- Emits events consumed by Audio/Telemetry adapters.

#### 9. Evidence Required Before Integration
- Bit-identical kinematic trajectory parity across 1,000 simulated levels compared against recorded reference session runs.
- Absolute determinism: Running 100 iterations of identical input streams produces identical state checksums at every tick.

#### 10. Integration Owner
Integration Authority (Simulation & Engine Core Lead)

#### 11. Promotion Gate
**Gate G-B (ARCH-4):** 100% pass rate on `simulation_parity_suite.ts` and `torture_suite.ts`.

#### 12. Rollback Strategy
Fall back to legacy `GameEngine.update()` simulation loop.

---

### LANE C — CAMERA & RENDERING

#### 1. Exact Source Files to Inspect
- `src/engine/Camera.ts`
- `src/engine/Renderer.ts`
- `src/engine/plasmaPresentation.ts`
- `src/visual/realms.ts`
- `src/visual/worldDraw.ts`
- `src/config/visualCalibration.ts`

#### 2. Behavioral Contracts to Preserve
- **PP1–PP10:** Single crest authority, canonical screen projection ($worldToScreenY$), offscreen crest discipline, camera independence, mobile bounds sanity, constant visual signatures.
- **Actionable-Row Framing Invariant:** Both the current player support row and the next actionable destination row must have answer text legible and framed within the readable viewport ($20\text{px} \le x_{\text{center}} \le 480\text{px}$).
- **Diagonal Tracking Authority:** Smooth progression vector following without premature landing drift.
- Visual FX continuity: Floating nebula particles, jump dust, platform shatter fragments, plasma heat orange palettes.

#### 3. Questions to Answer
- How to transform the `Renderer` into a pure, stateless rendering pipeline that consumes an interpolated `SceneRenderSnapshot` rather than reading mutable engine state?
- How to decouple camera look-ahead kinematics from simulation physics so framing can adjust dynamically across screen aspect ratios?
- How to implement render batching or dirty-rect caching without visual artifacts?

#### 4. Artifacts to Produce
- `docs/specs/STATELESS_RENDER_PIPELINE_SPEC.md`
- `src/commercial/rendering/StatelessRenderer.ts` (prototype)
- `src/commercial/rendering/CameraFramingAuthority.ts` (prototype)
- `src/commercial/rendering/SceneRenderSnapshot.ts` (prototype)
- `tests/commercial/render_framing_suite.ts`

#### 5. Interfaces to Propose
```typescript
export interface SceneRenderSnapshot {
  alpha: number; // interpolation factor [0, 1] between physics ticks
  camera: { x: number; y: number; zoom: number };
  viewport: { width: number; height: number; dpr: number };
  zyx: RenderableEntity;
  platforms: RenderablePlatform[];
  wave: RenderablePlasmaWave;
  particles: RenderableParticleSystem;
  theme: RealmSpec;
}
```

#### 6. Files it May Prototype
- `src/commercial/rendering/*`
- `src/commercial/camera/*`
- `tests/commercial/rendering/*`

#### 7. Files it Must NOT Modify
- `src/engine/*`
- `src/App.tsx`
- `src/math/*`

#### 8. Dependencies on Other Lanes
- Depends on **Lane B** for snapshot input data.
- Depends on **Lane A** for canonical platform geometry paths.
- Feeds into **Lane D** for 60fps mobile GPU efficiency.

#### 9. Evidence Required Before Integration
- Canvas snapshot pixel / visual regression verification showing identical rendering outputs against reference canvas frames.
- Automated validation of actionable-row framing across all 30 campaign levels under 16:9, 19.5:9, and 4:3 viewports.

#### 10. Integration Owner
Integration Authority (Graphics & Presentation Lead)

#### 11. Promotion Gate
**Gate G-C (ARCH-6 / ARCH-7):** Passing all PP1–PP10 contracts + actionable-row framing verification suite.

#### 12. Rollback Strategy
Restore `Renderer.ts` drawing calls directed from legacy engine loop.

---

### LANE D — MOBILE / IPHONE / PERFORMANCE

#### 1. Exact Source Files to Inspect
- `index.html` (viewport meta tags, CSS body constraints)
- `src/index.css` (game wrapper, touch-action, safe areas, full-bleed handling)
- `src/App.tsx` (pointer/touch event listeners, window resize handlers)
- `src/engine/PlatformHitGeometry.ts` (`clientToCanvasCoords`, DPR handling)
- `src/engine/GameEngine.ts` (touch cancellation, gesture prevention)

#### 2. Behavioral Contracts to Preserve
- Responsive fullscreen viewport presentation on modern mobile screens (notably iPhone dynamic islands, home indicator bars, 19.5:9 aspect ratios).
- Zero pinch-to-zoom, zero double-tap zoom, zero scroll drag interference during gameplay.
- Precise touch target resolution matching mouse click selection semantics.
- Fluid 60fps performance without garbage collection micro-stutters.

#### 3. Questions to Answer
- How does iOS Safari address bar collapse and dynamic viewport units (`dvh`/`lvh`) affect canvas letterboxing?
- Are memory allocations during the simulation tick producing garbage collection spikes on mobile CPUs?
- How to ensure high-DPR displays (e.g., iPhone Retina 3x) render crisp text and particle lines without over-saturating fill-rate bandwidth?

#### 4. Artifacts to Produce
- `docs/specs/MOBILE_VIEWPORT_PERFORMANCE_SPEC.md`
- `src/commercial/mobile/ViewportManager.ts` (prototype)
- `src/commercial/mobile/TouchGestureInterceptor.ts` (prototype)
- `tests/commercial/mobile_touch_benchmark_suite.ts`

#### 5. Interfaces to Propose
```typescript
export interface ViewportMetrics {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  letterbox: { offsetX: number; offsetY: number; renderWidth: number; renderHeight: number };
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
}
```

#### 6. Files it May Prototype
- `src/commercial/mobile/*`
- `tests/commercial/mobile/*`

#### 7. Files it Must NOT Modify
- `src/engine/*`
- `src/math/*`
- `src/audio/*`

#### 8. Dependencies on Other Lanes
- Depends on **Lane A** for touch hit tolerance.
- Depends on **Lane C** for canvas resolution sizing and DPR buffer allocation.

#### 9. Evidence Required Before Integration
- Synthetic touch coordinate benchmark proving zero touch-drift under synthetic viewport resize/scroll conditions.
- Allocation profiler report confirming $< 1\text{MB}/\text{min}$ heap churn during active gameplay.

#### 10. Integration Owner
Integration Authority (Mobile & Web Platform Lead)

#### 11. Promotion Gate
**Gate G-D (ARCH-12):** Mobile touch accuracy certification and iPhone viewport stress verification.

#### 12. Rollback Strategy
Retain reference CSS viewport containment rules in `index.css`.

---

### LANE E — CHARACTERIZATION, PARITY & VERIFICATION

#### 1. Exact Source Files to Inspect
- `tests/*` (all 8 existing test suites)
- `scripts/run-tests.mjs`
- `src/evidence/challengeTrace.ts`
- `src/debug/DevelopmentTelemetry.ts`
- Every file inspected by Lanes A, B, C, and D.

#### 2. Behavioral Contracts to Preserve
- Preservation of all 8 authoritative test suites: `architecture_contract_suite.ts`, `challenge_trace_suite.ts`, `math_challenge_suite.ts`, `config_authority_suite.ts`, `player_path_suite.ts`, `torture_suite.ts`, `settings_interaction_suite.ts`.
- Verification of every contract from PV1–PV8, PP1–PP10, CI1–CI12, RA1–RA8, ST1–ST12, MB1–MB10, MC1–MC11, CF1–CF12.

#### 3. Questions to Answer
- How to record deterministic session "oracles" (inputs, random seeds, outputs, timestamps, kinematics) from the reference engine to replay against commercial components?
- How to catch regressions immediately in headless CI within $< 30$ seconds?
- How to construct dual-run execution harnesses that compare legacy vs. commercial subsystems side-by-side in real-time?

#### 4. Artifacts to Produce
- `src/evidence/ParityOracleRecorder.ts`
- `src/evidence/DualRunParityHarness.ts`
- `tests/characterization/reference_oracle_dataset.json`
- `tests/characterization/subsystem_parity_validator.ts`
- `docs/reports/PARITY_COMPLIANCE_MATRIX.md`

#### 5. Interfaces to Propose
```typescript
export interface ParityOracleRecord {
  levelId: string;
  seed: number;
  inputScript: Array<{ tick: number; clientX: number; clientY: number }>;
  expectedSnapshots: Array<{
    tick: number;
    zyx: { x: number; y: number; currentRow: number; status: string };
    wave: { y: number };
    score: number;
  }>;
  finalOutcome: 'WIN' | 'LOSS';
}

export interface ParityVerificationResult {
  passed: boolean;
  divergenceTick?: number;
  expectedState?: Record<string, unknown>;
  actualState?: Record<string, unknown>;
  deltaMetric?: number;
}
```

#### 6. Files it May Prototype
- `src/evidence/*`
- `tests/characterization/*`
- `tests/fixtures/*`

#### 7. Files it Must NOT Modify
- Authoritative contracts in `tests/architecture_contract_suite.ts` (without Integration Authority signoff).
- Production gameplay logic in `src/engine/*`.

#### 8. Dependencies on Other Lanes
- Serves as the independent auditor and judge for Lanes A, B, C, and D.
- Provides test fixtures and verification oracles to all specialist lanes.

#### 9. Evidence Required Before Integration
- Lane E is the *producer* of evidence. Its characterization harness must pass self-validation on the frozen legacy engine before auditing new components.

#### 10. Integration Owner
Primary Integration Authority (Verification Lead)

#### 11. Promotion Gate
**Gate G-E (ARCH-1):** Full Characterization Harness operational with zero false positives on the frozen baseline.

#### 12. Rollback Strategy
The characterization suite is non-destructive and cannot break production runtime; flawed tests are quarantined to `tests/experimental/`.

---

## 3. BEHAVIOR CLASSIFICATION REGISTRY

Every behavior in JumpMath R2 is explicitly classified below into one of four governance tiers to ensure regressions are blocked while known bugs are intentionally repaired rather than codified.

```
+----------------------------------------------------------------------------------------------------+
|                                    BEHAVIOR CLASSIFICATION MATRIX                                  |
+----------------------------------------------------------------------------------------------------+
| FROZEN / ACCEPTED                     | Absolute parity required; zero change permitted            |
| TUNABLE                               | Parameterized ranges; adjustments allowed within bounds    |
| KNOWN DEFECT — DO NOT PRESERVE        | Defective legacy behavior; must NOT be replicated in parity|
| UNACCEPTED / REQUIRES PLAYER REVIEW   | Gameplay / aesthetic decisions awaiting final signoff      |
+----------------------------------------------------------------------------------------------------+
```

| Subsystem | Feature / Mechanism | Classification | Authority / Rationale |
| :--- | :--- | :--- | :--- |
| **Math** | Single Correct Answer Per Row | **FROZEN / ACCEPTED** | MC1: Core educational invariant. |
| **Math** | Option Uniqueness & Decoy Models | **FROZEN / ACCEPTED** | MB1–MB7: Strict mathematical integrity. |
| **Math** | Lookahead Row Immutability | **FROZEN / ACCEPTED** | MC8, MC11: Answers must not change when player jumps. |
| **Math** | Deterministic Seed Generation | **FROZEN / ACCEPTED** | MC6, CI11: Auditability and reproducible runs. |
| **Platform** | Visual Platform = Interaction Target | **FROZEN / ACCEPTED** | PF1–PF4: Player requirement from Phase 4C-R3. |
| **Platform** | Text / Label Used as Hitbox Bounds | **KNOWN DEFECT — DO NOT PRESERVE** | Phase 4C defect: Player could not select platform edges. |
| **Platform** | Deterministic Overlap Tie-Breaking | **FROZEN / ACCEPTED** | PF5: Body > Tolerance > Distance > ID. |
| **Platform** | Platform Shatter Animation Duration | **TUNABLE** | $0.3\text{s} - 0.5\text{s}$ visual feedback tuning. |
| **Platform** | Shape Geometry Definitions (6 types) | **FROZEN / ACCEPTED** | PF2, realms.ts: Exact mathematical dimensions. |
| **Camera** | Actionable-Row Legible Framing | **FROZEN / ACCEPTED** | Next row answer center $20 \le x \le 480$. |
| **Camera** | Left/Right Viewport Clipping on Diagonals | **KNOWN DEFECT — DO NOT PRESERVE** | Phase 4C defect: Edge options clipped on Sector 5 diagonal routes. |
| **Camera** | Vertical Lerp Tracking Speed | **TUNABLE** | $8.0 - 14.0$ lerp rate for comfortable player follow. |
| **Camera** | Horizontal Lookahead Drift on Land | **KNOWN DEFECT — DO NOT PRESERVE** | Camera drift past target row prior to landing. |
| **Plasma** | World Y Physical Crest Authority | **FROZEN / ACCEPTED** | PV3, PP1: Single authoritative crest. |
| **Plasma** | Wave Speed Escalation per Sector | **TUNABLE** | Difficulty curve values in `LevelDatabase.ts`. |
| **Plasma** | Death Recovery Gap ($350\text{px}$) | **FROZEN / ACCEPTED** | PV6: Deterministic recovery breathing room. |
| **Plasma** | Plasma Shield Invulnerability ($2.5\text{s}$)| **FROZEN / ACCEPTED** | PV6: Post-respawn safety window. |
| **Plasma** | Visual Signature Colors & Glow Blur | **FROZEN / ACCEPTED** | PP10: 26px blur, 3.5px white core, heat orange body. |
| **Player** | Kinematic Jump Arc & Timing | **FROZEN / ACCEPTED** | Parabolic trajectory $t \in [0, 1]$, $0.4\text{s}$ duration. |
| **Player** | Wrong-Answer Bounce Kinematics | **FROZEN / ACCEPTED** | Elastic rebound returning to support row. |
| **Player** | Squash & Stretch Visual Ratios | **TUNABLE** | $\pm 15\%$ visual squash response on impact. |
| **Campaign** | 30 Levels across 6 Themed Sectors | **FROZEN / ACCEPTED** | CI10, CI12: Canonical campaign structure. |
| **Campaign** | Sector Clear Requirements | **FROZEN / ACCEPTED** | 5 levels cleared per sector unlocks next sector. |
| **Review** | Unlock All Levels for Review Toggle | **FROZEN / ACCEPTED** | RA1–RA8: Diagnostic and testing override. |
| **Review** | Progress Mutation Prevention in Review| **FROZEN / ACCEPTED** | RA3, RA7: Review sessions must never save to progress. |
| **Settings** | Modal Accessible from All Screens | **FROZEN / ACCEPTED** | ST1–ST4: Title, Campaign, Ready, Playing screens. |
| **Telemetry**| Observational-Only Invariant | **FROZEN / ACCEPTED** | ST7: Telemetry cannot alter gameplay logic. |
| **Audio** | Procedural Web Audio Sound FX | **FROZEN / ACCEPTED** | Contract H, U: Jump, bounce, chime, wave hum. |
| **Audio** | Music Track / Soundtrack Integration | **UNACCEPTED / REQUIRES PLAYER REVIEW** | Pending future audio composition review. |
| **UI** | Mobile Viewport Letterboxing Style | **UNACCEPTED / REQUIRES PLAYER REVIEW** | Pillarbox matte color vs. dynamic background bleed. |

---

## 4. REVISED MIGRATION ROADMAP (ARCH-1 THROUGH ARCH-15)

```
ARCH-1: Freeze & Parity Harness (Lane E)
   |
ARCH-2: Commercial Domain Contracts (Lanes A-E)
   |
ARCH-3: Geometry & Input Authority (Lane A)
   |
ARCH-4: Pure Simulation Core (Lane B)
   |
ARCH-5: Platform & World Domain (Lane A & B)
   |
ARCH-6: Camera & Framing Authority (Lane C)
   |
ARCH-7: Stateless Presentation Engine (Lane C)
   |
ARCH-8: Plasma Domain Migration (Lane B & C)
   |
ARCH-9: Campaign & Persistence Engine
   |
ARCH-10: Application Shell & Review UI
   |
ARCH-11: Audio, Effects & Telemetry Adapters
   |
ARCH-12: Mobile / iPhone Certification (Lane D)
   |
ARCH-13: Full Runtime Dual-Parity Run (Lane E)
   |
ARCH-14: Legacy Authority Retirement
   |
ARCH-15: Commercial Production Freeze
```

### Phase Details & Dependency Graph Rationale

#### ARCH-1 — Behavioral Freeze + Characterization Harness
- **Primary Lane:** Lane E
- **Rationale:** Parity tooling must exist **before** we refactor anything. Records golden reference oracle logs across all 30 campaign levels under fixed seeds.
- **Exit Gate:** `tests/characterization/subsystem_parity_validator.ts` operational and certifying legacy SOT.

#### ARCH-2 — Commercial Domain Model + Interface Contracts
- **Primary Lane:** Integration Authority (all lanes contributing)
- **Rationale:** Establishes pure TypeScript interfaces for entities, events, and inputs. Zero runtime code replacement.
- **Exit Gate:** Complete interface definitions in `src/commercial/contracts/*` passing static type checks.

#### ARCH-3 — Geometry + Input Authority
- **Primary Lane:** Lane A (Geometry & Input)
- **Rationale:** Input and hit-testing are leaf dependencies; establishing them first guarantees that player selection uses the certified visual platform bounds without text-box clipping bugs.
- **Exit Gate:** `Gate G-A` passed; 100% agreement between canonical visual bounds and hit testing.

#### ARCH-4 — Pure Simulation / Session State Machine
- **Primary Lane:** Lane B (Simulation Core)
- **Rationale:** Simulation depends only on inputs and mathematical configs, not on rendering or DOM. Converts game update into a pure function `(State, Input) -> State`.
- **Exit Gate:** `Gate G-B` passed; 1,000 level simulation runs match oracle logs tick-for-tick.

#### ARCH-5 — Platform / World Migration
- **Primary Lane:** Lane A & Lane B
- **Rationale:** Connects the pure simulation core to the arithmetic-ignorant `PlatformManager` and the lookahead generation pipeline.
- **Exit Gate:** All Phase 3B math contracts (MC1–MC11) pass against the new simulation state.

#### ARCH-6 — Camera / Framing Authority
- **Primary Lane:** Lane C (Camera & Presentation)
- **Rationale:** Camera relies on player position from simulation (ARCH-4) and platform extents (ARCH-5). Solves diagonal row framing and lookahead tracking.
- **Exit Gate:** Zero actionable-row clipping across all diagonal levels in Sector 5 under mobile aspect ratios.

#### ARCH-7 — Stateless Presentation / Renderer Migration
- **Primary Lane:** Lane C (Rendering)
- **Rationale:** Renderer consumes immutable snapshots produced by ARCH-4, ARCH-5, and ARCH-6. Eliminates mutable engine reads from draw calls.
- **Exit Gate:** Canvas pixel regression tests match reference frames with zero artifacting.

#### ARCH-8 — Plasma Migration
- **Primary Lane:** Lane B & Lane C
- **Rationale:** Plasma has distinct physical pursuit rules (Lane B) and presentation shader rules (Lane C). Migrates both into the new architecture.
- **Exit Gate:** 100% pass on PV1–PV8 and PP1–PP10 contract suites.

#### ARCH-9 — Campaign + Persistence
- **Primary Lane:** Integration Authority
- **Rationale:** Manages level sequencing, sector unlock persistence, and review mode overrides.
- **Exit Gate:** CI1–CI12 and RA1–RA8 contracts verified under new session manager.

#### ARCH-10 — App Shell / Settings / Review
- **Primary Lane:** Integration Authority
- **Rationale:** Reconnects React UI overlays, settings dialogs, and navigation to the new session orchestration layer.
- **Exit Gate:** ST1–ST12 pass; settings modal accessible across all screen states without input bleed.

#### ARCH-11 — Audio / Effects / Telemetry Adapters
- **Primary Lane:** Integration Authority
- **Rationale:** Binds sound synthesis and telemetry collectors to the domain event bus.
- **Exit Gate:** Audio Contract H and U verified; telemetry event sequence verified monotonic.

#### ARCH-12 — Mobile / iPhone Certification
- **Primary Lane:** Lane D (Mobile & Performance)
- **Rationale:** Final verification of mobile viewport, safe area insets, touch latency, and memory footprint.
- **Exit Gate:** `Gate G-D` passed; zero touch-drift, zero scroll interference, sustained 60fps on mobile.

#### ARCH-13 — Full Runtime Parity Certification
- **Primary Lane:** Lane E (Parity Authority)
- **Rationale:** Comprehensive dual-run execution of entire game: 30 levels played by automated bot on both legacy and commercial engines.
- **Exit Gate:** Zero unintended divergence detected across all states and metrics.

#### ARCH-14 — Legacy Authority Retirement
- **Primary Lane:** Integration Authority
- **Rationale:** Deprecates and deletes legacy `GameEngine.ts` and transitional adapters once commercial engine has earned sole production authority.
- **Exit Gate:** Codebase clean of legacy files; build and lint clean; all test suites green.

#### ARCH-15 — Commercial Runtime Freeze
- **Primary Lane:** Integration Authority
- **Rationale:** Tags commercial release baseline `JUMPMATH-COMMERCIAL-V1-FROZEN`.
- **Exit Gate:** Program completion signoff.

---

## 5. SUMMARY OF DIRECTIVES FOR ARCH-1

1. **Do not implement production features.**
2. **Lane E commences construction of the Characterization & Parity Recording Harness (`tests/characterization/*`).**
3. **Primary Integration Authority reviews and seals the baseline oracle dataset.**
4. **All production source files remain frozen.**
