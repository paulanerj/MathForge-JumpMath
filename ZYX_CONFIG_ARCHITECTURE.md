# ZYX CONFIGURATION ARCHITECTURE (PHASE 2A)

**Governing Baseline:** `ZYX-00-R1`  
**System Location:** `src/config/`  
**Status:** IMPLEMENTED & VERIFIED  

---

## 1. Executive Summary & Design Principles

Phase 0 identified the dispersion of gameplay and presentation constants into scattered magic numbers across `src/engine/` as a major architectural debt incurred during modular migration.

Phase 2A restores **Configuration Authority** without altering game feel, mechanics, or regression integrity.

### Core Architectural Axioms
1. **Single Source of Authority**: All tunable gameplay, physics, camera, platform, wave, flow, catastrophe, and audio constants reside in a unified, typed configuration object. No subsystem may maintain shadow defaults or fallback magic numbers.
2. **Strict Behavioral Parity**: Default configuration values are bitwise-identical to the accepted modular values established in `ZYX-00-R1`. Zero gameplay drift is introduced.
3. **Explicit Dependency Injection**: Subsystems never import a mutable global singleton. The `GameEngine` receives a typed `ZyxConfig` at construction time, propagates the necessary domain configurations down to sub-modules, and exposes its authoritative configuration instance.
4. **Deep Immutability & Overrides**: The default configuration is deeply frozen (`Object.freeze`). Configuration overrides are merged hierarchically using a type-safe factory (`createZyxConfig(overrides)`).
5. **Separation of Concerns**:
   - **Configuration** (`src/config/`): Governs *how the engine plays, moves, looks, and feels*.
   - **Curriculum / Content** (`LevelSchema`, `THEMES`): Governs *what math problems and visual skins are presented*.
   - **Derived Physics**: Formulas and spatial layouts (e.g. platform placement, jump arc progression) are derived mathematically from config properties, preserving mathematical coherence.

---

## 2. Directory Structure

```
src/
└── config/
    ├── index.ts           # Public API barrel export
    ├── configTypes.ts     # TypeScript interface definitions (strongly typed domains)
    ├── defaults.ts        # Immutable DEFAULT_ZYX_CONFIG with ZYX-00-R1 parity values
    └── zyxConfig.ts       # Config factory with deep merge and override support
```

---

## 3. Configuration Domain Schemas

The configuration schema is partitioned into 8 cohesive functional domains:

### 3.1 Gameplay (`config.gameplay`)
Governs round rules, timers, panic thresholds, time scaling, and cleanup boundaries:
- `winCondition`: Target consecutive correct answers to trigger hyperspace warp (`10`).
- `turnTimeLimit`: Starting time allocated per question in seconds (`10.0`).
- `hintTimeRatio`: Ratio of remaining time at which Zyx's eye begins tracking the correct platform (`0.50`).
- `moodDangerRatio`: Remaining time ratio triggering the `danger` mood state (`0.50`).
- `moodCriticalRatio`: Remaining time ratio triggering the `critical` panic mood state (`0.20`).
- `maxDeltaTime`: Upper bound on single-frame $\Delta t$ to prevent physics explosions on tab switch (`0.10`).
- `warpDurationMs`: Total elapsed milliseconds of hyperspace camera acceleration (`1000`).
- `warpAccelMultiplier`: Camera acceleration factor during hyperspace warp (`2500`).
- `kilonovaDrainRate`: Passive narrative pressure depletion rate in units per second (`2.0`).
- `kilonovaCorrectPush`: Narrative distance restored on correct answer (`15.0`).
- `kilonovaWrongPenalty`: Narrative distance docked on incorrect choice (`-20.0`).
- `platformPruneThreshold`: Maximum allowed platforms in memory before culling (`50`).
- `platformPruneRowsBehind`: Number of rows behind the active player row retained before deletion (`5`).

### 3.2 Jump & Movement Physics (`config.jump`)
Governs Zyx's arc trajectory, hang time, squash-and-stretch deformation, and wrong-answer rejection:
- `jumpSpeed`: Arc progress rate multiplier ($dt \times 1.25$, yielding $\approx 0.8$s flight duration).
- `arcKeyframe1`: First interpolation keyframe for jump curve acceleration (`0.42`).
- `arcKeyframe2`: Second interpolation keyframe for jump apex hang-time (`0.60`).
- `squashY`: Maximum vertical squash deformation factor during jump (`0.40`).
- `stretchX`: Horizontal compensation factor during jump (`0.20`).
- `apexHeight`: Parabolic lift height in pixels above the direct chord (`220`).
- `bounceDuration`: Duration in seconds of the wrong-answer bounce-back rejection arc (`0.42`).
- `bounceHoldFrames`: Freeze frames before bounce rejection arc begins (`9`).
- `bounceApexHeight`: Parabolic height in pixels during rejection bounce (`90`).
- `bounceRotAmplitude`: Maximum tumble wobble in radians during bounce (`0.35`).
- `bounceSquashY`: Vertical squash factor during bounce (`0.25`).
- `bounceStretchX`: Horizontal stretch factor during bounce (`0.15`).
- `bounceLandSx`: Horizontal squash factor when landing from a bounce (`1.45`).
- `bounceLandSy`: Vertical squash factor when landing from a bounce (`0.55`).

### 3.3 Platform Geometry & Layout (`config.platform`)
Governs spatial generation, lane separation, and landing effects:
- `width`: Standard platform width in canvas pixels (`120`).
- `height`: Standard platform height in canvas pixels (`50`).
- `gapX`: Lateral/orthogonal lane offset between adjacent choices (`140`).
- `gapY`: Longitudinal row spacing along the progression vector (`220`).
- `initialSpawnRows`: Pre-spawn row depth generated at level initialization (`10`).
- `impactDuration`: Lifetime in seconds of the landing flash effect (`0.15`).
- `impactParticleCount`: Number of spark particles spawned on landing (`15`).

### 3.4 Plasma Wave & Pressure (`config.wave`)
Governs the pursuing death front:
- `spawnDistanceBehind`: Initial pixel offset of the wave behind Zyx (`900`).
- `baseSpeed`: Base pursuit velocity in pixels per second (`28.0`).
- `proximityCollisionDist`: Margin of penetration before wave kill triggers (`26`).
- `warningDistance`: Proximity distance at which the red heat warning starts fading in (`520`).
- `warningHeightFactor`: Height scale of the bottom warning gradient (`300`).

### 3.5 Camera & Viewport (`config.camera`)
Governs tracking smoothness, framing offsets, and screen trauma:
- `lerpRateX`: Horizontal camera tracking exponential factor (`5.0`).
- `lerpRateY`: Vertical camera tracking exponential factor (`5.0`).
- `targetOffsetY`: Vertical offset in pixels placing Zyx in the lower third of the screen (`150`).
- `shakeDecay`: Per-frame trauma decay factor (`0.90`).
- `chromaSplitDecay`: Per-frame chromatic aberration decay rate (`1.4`).

### 3.6 Quantum Flow State (`config.flow`)
Governs the heightened reward state:
- `comboThreshold`: Minimum combo streak required to unlock Flow (`10`).
- `minTimeLeft`: Minimum remaining time in seconds required to maintain Flow (`5.0`).
- `bgSpeedMultiplier`: Parallax velocity multiplier applied to background in Flow (`1.8`).
- `heartbeatInterval`: Audio heartbeat pulse cadence in seconds (`0.50`).

### 3.7 Catastrophe Sequences (`config.catastrophe`)
Governs mortician failure sequencing and particle mechanics:
- `shardGravity`: Downward acceleration on shattered platform fragments in px/s² (`800`).
- `voidSpeed`: Expansion speed rate for singularity collapse (`3.2`).
- `waveSlowdown1`: Initial time-dilation factor before wave impact (`0.55`).
- `waveSlowdown2`: Secondary freeze time-dilation factor before wave impact (`0.08`).
- `detonationParticles`: Number of high-velocity spark fragments emitted on detonation (`94`).
- `orbitalDuration`: Duration in seconds of the orbital strike beam sequence (`1.2`).

### 3.8 Audio & Synthesizer (`config.audio`)
Governs sound synthesis gains, tempos, and filter cutoffs:
- `masterMusicGain`: Output volume for melodic synthesizer (`0.40`).
- `masterDroneGain`: Output volume for ambient sub-drone (`0.20`).
- `defaultTempo`: Base music sequencer BPM (`130`).
- `filterFreqClosed`: Normal lowpass filter cutoff frequency in Hz (`400`).
- `filterFreqFlow`: Filter cutoff in Flow state in Hz (`1200`).
- `filterFreqPanic`: Filter cutoff in Danger/Critical state in Hz (`2500`).
- `heartbeatGain`: Pulse gain for Flow state heartbeat (`0.60`).
- `panicTickInterval`: Time interval between panic ticks in seconds (`0.08`).

### 3.9 Player Entities & Particle Kinetics (`config.player`)
- `trailDecayNormal`: Trail decay rate in normal mode (`3.5`).
- `trailDecayFlow`: Trail decay rate in Flow mode (`1.5`).
- `particleGravity`: Particle gravity downward acceleration (`600`).
- `particleLifeDecay`: Particle opacity fade rate per second (`2.0`).

---

## 4. Injection Pattern & Lifecycle

```
[App / Host / Tests]
        │
        ▼
   ZyxConfig (DEFAULT_ZYX_CONFIG or createZyxConfig(overrides))
        │
        ▼
   GameEngine(canvas, schema, config)
        ├── this.config = config
        ├── this.platformManager = new PlatformManager(config.platform)
        ├── this.camera = new Camera(config.camera)
        ├── this.audio = new AudioEngine(config.audio)
        ├── this.mortician = new MorticianAPI(config.catastrophe)
        └── this.renderer = new Renderer(config)
```

Subsystems access their configuration directly from their injected config slice or via `engine.config`. No module queries global state or maintains hardcoded fallbacks.

---

## 5. Verification & Testing Strategy

The test suite is extended with dedicated configuration authority suites in `tests/config_suite.ts`:
1. **Default Parity Suite**: Verifies every field in `DEFAULT_ZYX_CONFIG` matches the forensic baseline of `ZYX-00-R1`.
2. **Single Authority Suite**: Verifies engine instances read values directly from their config and that changing config fields changes runtime behavior.
3. **Override Suite**: Confirms deep overrides work without altering unspecified sister fields.
4. **Reset Suite**: Verifies resetting or re-instantiating restores exact baseline values without prototype contamination.
5. **No-Dual-Defaults Audit**: Verifies engine files contain zero duplicate default magic numbers.
