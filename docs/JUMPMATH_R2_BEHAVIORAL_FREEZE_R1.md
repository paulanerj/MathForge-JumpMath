# JUMPMATH R2 BEHAVIORAL FREEZE SPECIFICATION (R1)
**Program:** JumpMath Commercial Architecture Program  
**Milestone:** ARCH-1 — Behavioral Freeze + Characterization Harness  
**Baseline Tag:** `JUMPMATH-R2-PHASE-4C-FROZEN`  
**Commit / Package Identity:** `jumpmath-numerix@2.0.0-phase4c-r3`  
**Capture Date:** 2026-10-01  
**Status:** AUTHORITATIVE BEHAVIORAL BASELINE

---

## 1. BASELINE IDENTITY & TOOLCHAIN

- **Repository / Package:** `jumpmath-numerix`
- **Baseline Git / Identity Tag:** `JUMPMATH-R2-PHASE-4C-FROZEN`
- **Node.js Runtime:** `v22.23.2`
- **npm Package Manager:** `10.9.8`
- **TypeScript:** `~5.8.2`
- **Vite Bundler:** `^6.2.0`
- **Test Runner / Transpiler:** `tsx ^4.21.0` / Node-local esbuild

### Authoritative Verification Commands
1. **Linter:** `npm run lint` (`tsc --noEmit`)
2. **Authoritative Test Suites:** `npm test` (`node ./scripts/run-tests.mjs`)
3. **Plasma Pursuit Authority:** `npm run test:plasma` (`node ./scripts/run-tests.mjs --only=architecture`)
4. **Behavioral Freeze Oracle:** `npm run test:behavioral-freeze` (`node ./scripts/run-behavioral-freeze.mjs`)
5. **Golden Traces Update:** `npm run behavioral-freeze:update -- --confirm`
6. **Production Build:** `npm run build` (`vite build`)

---

## 2. RECONCILED DEFECT REGISTRY

| Historical Defect | Description | Current Status in SOT | Parity Policy for Commercial Engine |
| :--- | :--- | :--- | :--- |
| **DEFECT-1: Text-Only Platform Hitbox** | Platform hitbox was centered on number text, leaving wings/edges unclickable. | **REPAIRED / CONTRACTED** in Phase 4C-R3 (`PlatformHitGeometry.ts`). Visual body is now the minimum hitbox. | **EXCLUDED FROM PARITY.** Commercial engine must maintain full visual body hit testing. |
| **DEFECT-2: Diagonal Row Viewport Clipping** | On diagonal levels, edge platforms were pushed partially outside the canvas. | **PARTIALLY RESOLVED.** Evaluated by `evaluateActionableRowFraming()`, but camera requires dynamic padding. | **EXCLUDED FROM PARITY.** Commercial camera must dynamically preserve margins ($20\text{px} \le x \le 480\text{px}$). |
| **DEFECT-3: Landing Camera Drift** | Camera prematurely aimed at row $N+1$ before player landed on row $N$. | **REPAIRED / CONTRACTED** in `GameEngine.ts` (lines 901–914). Camera remains anchored to support row on land. | **EXCLUDED FROM PARITY.** Commercial camera must not introduce lookahead drift before landing. |

---

## 3. PLASMA PURSUIT CONTRACT CLARIFICATION

In alignment with the ARCH-1 charter, the player-accepted Plasma pursuit model is clarified and frozen:
1. **Single World-Space Crest Authority:** Wave advances along world Y coordinate ($wave.y$).
2. **Viewport-Relative Entrance:** Wave initializes offscreen and enters the visible viewport within $t \le 3.0\text{s}$.
3. **Constant Configured Pursuit Speed:** The wave advances at a constant physical speed per level configuration ($wave.y(t) = wave.y(0) - \text{speed} \times t$). There are **no dynamic speed curves, no artificial wave slowdowns, and no rubber-banding**.
4. **Viewport-Relative Recovery:** Following collision and death, the wave is respawned at a deterministic $350\text{px}$ recovery gap behind the player, accompanied by a $2.5\text{s}$ invulnerability shield.
5. **Zero Rubber-Banding or Player-Following:** Wave movement is independent of player jumps and camera motion.
6. **Tunability Surface:** The *speed value* ($\text{px}/\text{s}$) is a tunable level configuration parameter, but the *pursuit mechanism itself* is constant and non-adaptive.

---

## 4. BEHAVIOR REGISTRY SUMMARY

Total Registered Behaviors: **43**
- **FROZEN_ACCEPTED:** 32 behaviors (Strict parity required)
- **TUNABLE:** 4 behaviors (Configurable parameters within documented bounds)
- **KNOWN_DEFECT:** 3 behaviors (Excluded from commercial parity requirement)
- **UNACCEPTED:** 2 behaviors (Pending player/design review)
- **DEVELOPMENT_ONLY:** 2 behaviors (Internal diagnostic/calibration tools)

Full machine-readable registry is stored in `tests/characterization/behavioral-freeze-r1.json`.
