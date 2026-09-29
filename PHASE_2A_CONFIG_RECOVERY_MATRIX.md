# PHASE 2A — CONFIGURATION RECOVERY MATRIX

**Governing Baseline:** `ZYX-00-R1 — FORMALLY ACCEPTED`  
**Milestone:** Phase 2A Configuration Authority Recovery  
**Reference Authority:** `jumpmath_v19.html` (Phase 0 Audit)  
**Status:** FORENSIC AUDIT & EXTRACTION SPECIFICATION  

---

## 1. Classification Categories

Every candidate constant/tunable in the codebase has been audited and classified into one of the following categories:

- **`CONFIGURE NOW`**: Directly governs gameplay feel, physics, timing, geometry, pressure, or feedback in Phase 2A. Extracted to typed `ZyxConfig`.
- **`CONFIGURE NEXT / PHASE 2B`**: Valid configuration target (e.g., world palettes, Zyx SVG facial geometries, star/debris counts), deferred to Phase 2B (World Registry, Zyx Persona, Visual Studio).
- **`SYSTEM CONSTANT (HARDCODED)`**: Intrinsic mathematical or structural constants (e.g., canvas logical resolution ratio) that remain hardcoded in code.
- **`DERIVED VALUE`**: Values computed dynamically from design inputs (e.g., platform X/Y positions derived from row, progression vector, and spacing).
- **`CONTENT DATA`**: Level sequences, arithmetic curriculum targets, and preset themes that belong to `LevelSchema` rather than global engine config.
- **`UNRESOLVED`**: Tunables with ambiguous or coupled ownership requiring further architecture review.

---

## 2. Configuration Recovery Matrix

| Domain | Control | Current Location | Current Value | v19 Equivalent | Initial Authority | Extraction Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Gameplay** | `winCondition` | `GameEngine.ts:21` | `10` | `SECTOR_GOAL: 10` | Modular (`10`) | `CONFIGURE NOW` | Correct rows needed to trigger sector warp |
| **Gameplay** | `turnTimeLimit` | `GameEngine.ts:51, 80` | `10.0`s | `TIMER_SECONDS: 10` | Modular (`10`) | `CONFIGURE NOW` | Base seconds per question before timeout |
| **Gameplay** | `hintTimeRatio` | `GameEngine.ts:271` | `0.50` (50%) | `HINT_TIME_THRESHOLD` | Modular (`0.50`) | `CONFIGURE NOW` | Ratio of time left when directional eye hint points to answer |
| **Gameplay** | `moodDangerRatio` | `GameEngine.ts:288` | `0.50` (50%) | `PANIC_THRESHOLD` | Modular (`0.50`) | `CONFIGURE NOW` | Ratio when Zyx switches mood to `danger` |
| **Gameplay** | `moodCriticalRatio` | `GameEngine.ts:286` | `0.20` (20%) | `CRITICAL_THRESHOLD` | Modular (`0.20`) | `CONFIGURE NOW` | Ratio when Zyx switches mood to `critical` panic |
| **Gameplay** | `maxDeltaTime` | `GameEngine.ts:457` | `0.10`s (100ms) | `MAX_FRAME_DT: 0.1` | Modular (`0.10`) | `CONFIGURE NOW` | Maximum allowable single-frame dt clamp for tab switches |
| **Gameplay** | `warpDurationMs` | `GameEngine.ts:380` | `1000`ms | `WARP_TIME: 1200` | Modular (`1000`) | `CONFIGURE NOW` | Duration of acceleration warp before level complete |
| **Gameplay** | `warpAccelMultiplier` | `GameEngine.ts:376` | `2500` | `WARP_SPEED: 3000` | Modular (`2500`) | `CONFIGURE NOW` | Camera acceleration rate during hyperspace warp |
| **Gameplay** | `kilonovaDrainRate` | `GameEngine.ts:294` | `2.0` /s | `PRESSURE_DRAIN: 2.5` | Modular (`2.0`) | `CONFIGURE NOW` | Passive loss of narrative safety distance |
| **Gameplay** | `kilonovaCorrectPush`| `GameEngine.ts:411` | `15.0` | `REWARD_PUSH: 20` | Modular (`15.0`) | `CONFIGURE NOW` | Narrative safety distance added on correct answer |
| **Gameplay** | `kilonovaWrongPenalty`| `GameEngine.ts:417`| `-20.0` | `PENALTY_DRAIN: -25` | Modular (`-20.0`) | `CONFIGURE NOW` | Narrative safety distance docked on wrong answer |
| **Gameplay** | `platformPruneThreshold`| `GameEngine.ts:352` | `50` | `PLATFORM_MAX_POOL` | Modular (`50`) | `CONFIGURE NOW` | Memory-leak bounding threshold for active platform count |
| **Gameplay** | `platformPruneRowsBehind`| `GameEngine.ts:354` | `5` | `CULL_ROWS_BEHIND` | Modular (`5`) | `CONFIGURE NOW` | How many rows behind current row are culled |
| **Jump** | `jumpSpeed` | `GameEngine.ts:305` | `1.25` ($\approx 0.8$s) | `JUMP_DURATION: 0.35s` | Modular (`1.25`) | `CONFIGURE NOW` | Progress rate multiplier along jump arc |
| **Jump** | `arcKeyframe1` | `GameEngine.ts:307` | `0.42` | `KEYFRAME_ACCEL` | Modular (`0.42`) | `CONFIGURE NOW` | Arc sub-division for launch acceleration |
| **Jump** | `arcKeyframe2` | `GameEngine.ts:308` | `0.60` | `KEYFRAME_FLOAT` | Modular (`0.60`) | `CONFIGURE NOW` | Arc sub-division for hang time at apex |
| **Jump** | `squashY` | `GameEngine.ts:311` | `0.40` | `SQUASH_FACTOR: 0.35` | Modular (`0.40`) | `CONFIGURE NOW` | Maximum vertical deformation along jump |
| **Jump** | `stretchX` | `GameEngine.ts:312` | `0.20` | `STRETCH_FACTOR: 0.20`| Modular (`0.20`) | `CONFIGURE NOW` | Horizontal inverse deformation along jump |
| **Jump** | `apexHeight` | `GameEngine.ts:326` | `220`px | `JUMP_HEIGHT: 180` | Modular (`220`) | `CONFIGURE NOW` | Maximum parabolic vertical lift above chord |
| **Jump** | `bounceDuration` | `GameEngine.ts:333` | `0.42`s | `REJECT_DURATION: 0.42`| Modular (`0.42`) | `CONFIGURE NOW` | Time in seconds for wrong-answer rejection arc |
| **Jump** | `bounceHoldFrames` | `GameEngine.ts:330, 422`| `9` frames | `BOUNCE_HOLD: 9` | Modular (`9`) | `CONFIGURE NOW` | Freeze/hitstop frames before bounce arc commences |
| **Jump** | `bounceApexHeight` | `GameEngine.ts:344` | `90`px | `REJECT_HEIGHT: 80` | Modular (`90`) | `CONFIGURE NOW` | Parabolic peak height during bounce-back |
| **Jump** | `bounceRotAmplitude`| `GameEngine.ts:345` | `0.35` rad | `REJECT_TUMBLE` | Modular (`0.35`) | `CONFIGURE NOW` | Tumble wobble during wrong-answer bounce |
| **Jump** | `bounceSquashY` | `GameEngine.ts:346` | `0.25` | `REJECT_SQUASH` | Modular (`0.25`) | `CONFIGURE NOW` | Vertical deformation during bounce |
| **Jump** | `bounceStretchX` | `GameEngine.ts:347` | `0.15` | `REJECT_STRETCH` | Modular (`0.15`) | `CONFIGURE NOW` | Horizontal deformation during bounce |
| **Jump** | `bounceLandSx` | `GameEngine.ts:338` | `1.45` | `IMPACT_LAND_SX` | Modular (`1.45`) | `CONFIGURE NOW` | Landing pancake width deformation |
| **Jump** | `bounceLandSy` | `GameEngine.ts:338` | `0.55` | `IMPACT_LAND_SY` | Modular (`0.55`) | `CONFIGURE NOW` | Landing pancake height deformation |
| **Platform** | `width` | `PlatformManager.ts:80` | `120`px | `PLATFORM_W: 130` | Modular (`120`) | `CONFIGURE NOW` | Authoritative platform width |
| **Platform** | `height` | `PlatformManager.ts:80` | `50`px | `PLATFORM_H: 50` | Modular (`50`) | `CONFIGURE NOW` | Authoritative platform height |
| **Platform** | `gapX` | `PlatformManager.ts:6` | `140`px | `LANE_GAP_X: 140` | Modular (`140`) | `CONFIGURE NOW` | Orthogonal spacing between platforms in a row |
| **Platform** | `gapY` | `PlatformManager.ts:5` | `220`px | `ROW_GAP_Y: 220` | Modular (`220`) | `CONFIGURE NOW` | Forward progression spacing between rows |
| **Platform** | `initialSpawnRows` | `PlatformManager.ts:25` | `10` | `PRESPAWN_COUNT: 10` | Modular (`10`) | `CONFIGURE NOW` | Number of forward rows spawned ahead of Zyx |
| **Platform** | `impactDuration` | `GameEngine.ts:400` | `0.15`s | `IMPACT_GLOW_TIME` | Modular (`0.15`) | `CONFIGURE NOW` | Duration of flash/highlight on landed platform |
| **Platform** | `impactParticleCount`| `GameEngine.ts:401` | `15` | `LAND_PARTICLES: 16` | Modular (`15`) | `CONFIGURE NOW` | Number of burst sparks emitted on landing |
| **Wave** | `spawnDistanceBehind`| `GameEngine.ts:161` | `900`px | `WAVE_START_DIST: 900`| Modular (`900`) | `CONFIGURE NOW` | Initial vertical distance of plasma wave behind Zyx |
| **Wave** | `baseSpeed` | `GameEngine.ts` / schema | `28.0`px/s | `WAVE_SPEED: 32.0` | Modular (`28.0`) | `CONFIGURE NOW` | Baseline pursuit speed of plasma wave |
| **Wave** | `proximityCollisionDist`| `GameEngine.ts:260`| `26`px | `COLLISION_PAD: 25` | Modular (`26`) | `CONFIGURE NOW` | Y-distance threshold where wave consumes Zyx |
| **Wave** | `warningDistance` | `Renderer.ts:646` | `520`px | `WARN_RANGE: 500` | Modular (`520`) | `CONFIGURE NOW` | Distance threshold for red proximity heat gradient |
| **Wave** | `warningHeightFactor`| `Renderer.ts:651` | `300`px | `WARN_HEIGHT: 320` | Modular (`300`) | `CONFIGURE NOW` | Maximum height of bottom-screen heat warning |
| **Camera** | `lerpRateX` | `Camera.ts:6` | `5.0` | `CAM_SMOOTH_X: 6.0` | Modular (`5.0`) | `CONFIGURE NOW` | Exponential tracking rate on X-axis |
| **Camera** | `lerpRateY` | `Camera.ts:7` | `5.0` | `CAM_SMOOTH_Y: 6.0` | Modular (`5.0`) | `CONFIGURE NOW` | Exponential tracking rate on Y-axis |
| **Camera** | `targetOffsetY` | `Camera.ts:7` | `150`px | `CAM_OFFSET_Y: 160` | Modular (`150`) | `CONFIGURE NOW` | Offset to keep Zyx centered in bottom 40% of viewport |
| **Camera** | `shakeDecay` | `GameEngine.ts:254` | `0.90` (10%/frame) | `SHAKE_DECAY: 0.90` | Modular (`0.90`) | `CONFIGURE NOW` | Damping multiplier for screen trauma |
| **Camera** | `chromaSplitDecay`| `GameEngine.ts:253` | `1.4` / frame | `CHROMA_DECAY: 1.5` | Modular (`1.4`) | `CONFIGURE NOW` | Recovery rate for RGB chromatic split |
| **Flow** | `comboThreshold` | `GameEngine.ts:264` | `10` | `FLOW_COMBO: 10` | Modular (`10`) | `CONFIGURE NOW` | Consecutive correct jumps required to trigger Flow |
| **Flow** | `minTimeLeft` | `GameEngine.ts:264, 267`| `5.0`s | `FLOW_MIN_TIME: 5.0` | Modular (`5.0`) | `CONFIGURE NOW` | Minimum time reserve needed to maintain Flow |
| **Flow** | `bgSpeedMultiplier`| `Renderer.ts:363` | `1.8` | `WARP_STAR_MULT: 2.0`| Modular (`1.8`) | `CONFIGURE NOW` | Parallax star speed multiplier in Flow state |
| **Catastrophe** | `shardGravity` | `GameEngine.ts:363` | `800`px/s² | `SHARD_GRAVITY: 900` | Modular (`800`) | `CONFIGURE NOW` | Downward acceleration for shattered platform pieces |
| **Catastrophe** | `voidSpeed` | `MorticianAPI.ts:37` | `3.2` | `VOID_SPEED: 3.5` | Modular (`3.2`) | `CONFIGURE NOW` | Speed of black-hole collapse animation |
| **Catastrophe** | `waveSlowdown1` | `MorticianAPI.ts:62` | `0.55` | `HITSTOP_SLOW1` | Modular (`0.55`) | `CONFIGURE NOW` | Pre-impact time-dilation phase 1 |
| **Catastrophe** | `waveSlowdown2` | `MorticianAPI.ts:65` | `0.08` | `HITSTOP_SLOW2` | Modular (`0.08`) | `CONFIGURE NOW` | Near-freeze time-dilation phase 2 before impact |
| **Catastrophe** | `detonationParticles`| `MorticianAPI.ts:133` | `94` | `DETONATION_COUNT: 100`| Modular (`94`) | `CONFIGURE NOW` | Number of debris particles on supernova death |
| **Catastrophe** | `orbitalDuration` | `MorticianAPI.ts:153` | `1.2`s | `ORBITAL_TIME: 1.2` | Modular (`1.2`) | `CONFIGURE NOW` | Total duration of orbital cannon strike |
| **Audio** | `masterMusicGain` | `AudioEngine.ts:167` | `0.40` | `BGM_VOLUME: 0.45` | Modular (`0.40`) | `CONFIGURE NOW` | Master volume for chiptune synthesizer |
| **Audio** | `masterDroneGain` | `AudioEngine.ts:40` | `0.20` | `DRONE_VOLUME: 0.25` | Modular (`0.20`) | `CONFIGURE NOW` | Master volume for ambient space drone |
| **Audio** | `defaultTempo` | `AudioEngine.ts:152` | `130` BPM | `TEMPO: 128` | Modular (`130`) | `CONFIGURE NOW` | Driving sequencer tempo |
| **Audio** | `filterFreqClosed` | `AudioEngine.ts:163, 213`| `400` Hz | `LPF_CLOSED: 400` | Modular (`400`) | `CONFIGURE NOW` | Lowpass filter cutoff during normal play |
| **Audio** | `filterFreqFlow` | `AudioEngine.ts:213` | `1200` Hz | `LPF_FLOW: 1200` | Modular (`1200`) | `CONFIGURE NOW` | Lowpass filter cutoff during Flow state |
| **Audio** | `filterFreqPanic` | `AudioEngine.ts:213` | `2500` Hz | `LPF_PANIC: 2600` | Modular (`2600`) | `CONFIGURE NOW` | Lowpass filter cutoff during cognitive danger |
| **Audio** | `heartbeatInterval`| `AudioEngine.ts:221` | `0.50`s | `HEARTBEAT_SEC: 0.5` | Modular (`0.50`) | `CONFIGURE NOW` | Rhythm interval of Flow state heartbeat thud |
| **Audio** | `panicTickInterval`| `AudioEngine.ts:236` | `0.08`s | `TICK_SEC: 0.08` | Modular (`0.08`) | `CONFIGURE NOW` | Rhythm interval of panic countdown ticker |
| **Player** | `trailDecayNormal` | `GameEngine.ts:302` | `3.5` /s | `TRAIL_FADE: 3.0` | Modular (`3.5`) | `CONFIGURE NOW` | Fade rate of Zyx's motion blur trail in normal mode |
| **Player** | `trailDecayFlow` | `GameEngine.ts:302` | `1.5` /s | `FLOW_TRAIL_FADE: 1.5`| Modular (`1.5`) | `CONFIGURE NOW` | Extended fade rate of trail in Flow state |
| **Player** | `particleGravity` | `GameEngine.ts:389` | `600`px/s² | `GRAVITY: 650` | Modular (`600`) | `CONFIGURE NOW` | Vertical gravity acceleration on spark particles |
| **Player** | `particleLifeDecay`| `GameEngine.ts:390` | `2.0` /s | `PARTICLE_FADE: 2.0` | Modular (`2.0`) | `CONFIGURE NOW` | Alpha fade rate on spark particles |
| **Presentation** | `bodyTorsoDimensions`| `Renderer.ts:4-7` | `{x:-26, y:-52, w:52, h:52}` | `BODY_TORSO` | Modular | `CONFIGURE NEXT / PHASE 2B` | SVG geometry definition for Zyx's torso capsule |
| **Presentation** | `palettes` | `Renderer.ts:8-17` | Color map | `PALETTES` | Modular | `CONFIGURE NEXT / PHASE 2B` | Color schemes for moods (`content`, `danger`, `critical`, etc.) |
| **Presentation** | `expressions` | `Renderer.ts:19-25` | Facial vectors | `EXPRESSIONS` | Modular | `CONFIGURE NEXT / PHASE 2B` | Eye and mouth geometry parameters per mood |
| **Presentation** | `starLayerCount` | `Renderer.ts:293` | `150` stars | `STAR_COUNT: 120` | Modular (`150`) | `CONFIGURE NEXT / PHASE 2B` | Background starfield population |
| **Presentation** | `nebulaGasCount` | `Renderer.ts:302` | `8` clouds | `NEBULA_COUNT: 8` | Modular (`8`) | `CONFIGURE NEXT / PHASE 2B` | Ambient nebula clouds |
| **Presentation** | `debrisCount` | `Renderer.ts:310` | `12` shards | `DEBRIS_COUNT: 12` | Modular (`12`) | `CONFIGURE NEXT / PHASE 2B` | Parallax foreground energy debris |
| **Content** | `themes` | `App.tsx:5-11` | Array of 5 themes | `THEMES` | Modular | `CONTENT DATA` | Background colors and palettes |
| **Content** | `vectors` | `App.tsx:13-19` | 5 progression vectors | `VECTORS` | Modular | `CONTENT DATA` | Orthogonal progression angles for levels |
| **Content** | `levelDatabase` | `LevelDatabase.ts:3-36`| 4 level schemas | `LEVELS` | Modular | `CONTENT DATA` | Intro curriculum schemas |
| **Geometry** | `platformCoordinates`| `PlatformManager.ts:82-84` | Derived formula | Formula | Modular | `DERIVED VALUE` | Calculated from `baseX + ox * offset * gapX` |
| **Math** | `targetAngle` | `GameEngine.ts:275` | `atan2(dy, dx)` | Formula | Modular | `DERIVED VALUE` | Angle to correct platform |
| **Structural** | `canvasAspectRatio` | `App.tsx:180-181` | `500x800` | `500x800` | Modular | `SYSTEM CONSTANT (HARDCODED)` | Authoritative logical game resolution |
| **Structural** | `hitTestGeometry` | `GameEngine.ts:109-115`| Bounding box | Formula | Modular | `DERIVED VALUE` | Canvas rect scale + camera offset hit testing |

---

## 3. Forensic Summary Statistics

- **Total Audited Tunables/Constants:** 78
- **Classified as `CONFIGURE NOW` (Migrated to `ZyxConfig` in Phase 2A):** 65 controls across 9 active runtime domains (Gameplay: 13, Jump: 14, Platform: 7, Wave: 5, Camera: 5, Flow: 3, Catastrophe: 6, Audio: 8, Player: 4)
- **Classified as `CONFIGURE NEXT / PHASE 2B`:** 6 controls (Presentation SVG geometry, star/gas/debris counts, color palettes)
- **Classified as `SYSTEM CONSTANT (HARDCODED)`:** 1 item (Authoritative logical resolution 500×800)
- **Classified as `DERIVED VALUE`:** 3 formulas (Platform world coordinate spacing, target angular calculation, hit test bounding transform)
- **Classified as `CONTENT DATA`:** 3 collections (`THEMES`, `VECTORS`, `LEVEL_DATABASE`)
- **Classified as `UNRESOLVED`:** 0
