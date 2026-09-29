# PHASE 2A-R2 — VISUAL REACHABILITY & CERTIFICATION INTEGRITY REPORT

**Governing Baseline:** `ZYX-00-R1 — FORMALLY ACCEPTED`  
**Successor Candidate:** `ZYX-2A-R2 — FINAL ARTIFACT FREEZE`  
**Milestone:** Phase 2A-R2 Visual Reachability & Player-Path Certification  
**Timestamp:** 2026-09-18T10:10:00-07:00  

---

## 1. Executive Summary

Phase 2A-R2 establishes formal certification of player-path reachability and visual bounds across all game modes, progression vectors, and viewports. 

This report documents the resolution of the visual reachability defect in diagonal space, the forensic geometry audit of progression vector normalization, the reconstruction of an isolated negative regression proof, the hardening of the mock Canvas test harness against argument corruption, and the reconciliation of configuration authority records.

---

## 2. Geometric Audit: Progression-Vector Normalization

### 2.1 The Unnormalized Diagonal Anomaly

In `ZYX-00-R1` and early Phase 2A, level configurations specified:
* Vertical levels (`level_1`, `level_2`): `progressionVector = { x: 0, y: -1 }`
  $$\|\vec{pv}_{\text{vert}}\| = \sqrt{0^2 + (-1)^2} = 1.0$$
* Diagonal levels (`level_3`, `level_4`): `progressionVector = { x: \pm 1, y: -1 }`
  $$\|\vec{pv}_{\text{diag}}\| = \sqrt{(\pm 1)^2 + (-1)^2} = \sqrt{2} \approx 1.41421356$$

The engine computed platform row baselines and orthogonal lane spreads directly using the raw vector:
$$\text{baseX} = \text{row} \times pv.x \times \text{gapY}$$
$$\text{baseY} = \text{row} \times pv.y \times \text{gapY}$$
$$ox = -pv.y, \quad oy = pv.x$$
$$\text{px} = \text{baseX} + ox \times \text{offset} \times \text{gapX}$$
$$\text{py} = \text{baseY} + oy \times \text{offset} \times \text{gapX}$$

With standard configuration constants $\text{gapY} = 220\text{ px}$ and $\text{gapX} = 140\text{ px}$:

1. **Row-to-Row Travel Distance (Before Normalization):**
   $$\text{EuclideanRowDistance}_{\text{unnorm}} = \sqrt{(1 \times 220)^2 + (-1 \times 220)^2} = 220 \sqrt{2} \approx 311.12698\text{ px}$$
   This represented an unintentional **+41.42% elongation** in jump length compared to the 220.0 px vertical baseline.

2. **Orthogonal Lane Separation (Before Normalization):**
   $$\text{EuclideanLaneDistance}_{\text{unnorm}} = \sqrt{(1 \times 140)^2 + (1 \times 140)^2} = 140 \sqrt{2} \approx 197.98990\text{ px}$$
   This represented a **+41.42% widening** between adjacent answer lanes.

3. **Incompatible Viewport Span (Before Normalization):**
   For a learner standing on the trailing lane ($\text{offset} = -1$) of row $r$ contemplating the leading lane ($\text{offset} = +1$) of row $r+1$:
   $$\Delta X_{\text{advance}} = 1 \times 220 = 220\text{ px}$$
   $$\Delta X_{\text{lane\_spread}} = (1 - (-1)) \times (1 \times 140) = 2 \times 140 = 280\text{ px}$$
   $$\Delta X_{\text{total}} = 220\text{ px} + 280\text{ px} = 500.0\text{ px}$$

On a standard $500\text{ px}$ logical canvas width ($[0, 500]$), the platform centers alone spanned **exactly 500.0 px**, leaving **0.0 px** of visual margin. Any camera placement that kept Option 1 within view inevitably clipped Zyx, and any camera placement centered on Zyx pushed Option 1 completely off the right edge ($> 500\text{ px}$).

### 2.2 Mathematical Normalization Rule

To restore geometric equivalence between vertical and diagonal sectors, progression vectors are resolved to unit vectors:
$$\hat{pv} = \frac{\vec{pv}}{\|\vec{pv}\|} = \left( \frac{pv.x}{\sqrt{pv.x^2 + pv.y^2}}, \frac{pv.y}{\sqrt{pv.x^2 + pv.y^2}} \right)$$

For $\vec{pv} = (1, -1)$:
$$\hat{pv} = \left( \frac{1}{\sqrt{2}}, -\frac{1}{\sqrt{2}} \right) \approx (0.70710678, -0.70710678)$$

For vertical levels where $\vec{pv} = (0, -1)$:
$$\hat{pv} = (0, -1) \quad (\text{magnitude } 1.0\text{, perfectly unchanged})$$

### 2.3 Geometric Properties After Normalization

1. **Euclidean Row Distance (After Normalization):**
   $$\text{EuclideanRowDistance}_{\text{norm}} = \sqrt{\left(\frac{220}{\sqrt{2}}\right)^2 + \left(-\frac{220}{\sqrt{2}}\right)^2} = 220.0\text{ px}$$
   Identical to the vertical baseline ($220.0\text{ px}$).

2. **Euclidean Lane Distance (After Normalization):**
   $$\text{EuclideanLaneDistance}_{\text{norm}} = \sqrt{\left(-\left(-\frac{1}{\sqrt{2}}\right) \times 140\right)^2 + \left(\frac{1}{\sqrt{2}} \times 140\right)^2} = 140.0\text{ px}$$
   Identical to the vertical baseline ($140.0\text{ px}$).

3. **Horizontal Span in World Coordinates (After Normalization):**
   $$\Delta X_{\text{advance}} = \frac{220}{\sqrt{2}} \approx 155.56349\text{ px}$$
   $$\Delta X_{\text{lane\_spread}} = 2 \times \frac{140}{\sqrt{2}} \approx 197.98990\text{ px}$$
   $$\Delta X_{\text{total}} = 155.56349 + 197.98990 \approx 353.55339\text{ px}$$

4. **Guaranteed Viewport Margins:**
   $$\text{Total Margin} = 500.0\text{ px} - 353.55339\text{ px} = 146.44661\text{ px}$$
   $$\text{Symmetric Margin Per Side} = \frac{146.44661\text{ px}}{2} \approx 73.22330\text{ px}$$

With $73.22\text{ px}$ of margin on both sides of the logical canvas, platform centers reside within $[73.22\text{ px}, 426.78\text{ px}]$, and platform bodies (width $120\text{ px}$, half-width $60\text{ px}$) remain fully tappable and well within the $[0, 500]$ canvas bounds.

---

## 3. Camera Target Composition

### 3.1 Tracking Formula
To eliminate visual jarring during jump arcs while ensuring both current character position and upcoming choice options remain framed, the horizontal camera target is composed as a weighted blend between Zyx's position and the upcoming row centerline:

```typescript
const rawPv = this.state.schema.progressionVector;
const mag = Math.hypot(rawPv.x, rawPv.y) || 1;
const pv = { x: rawPv.x / mag, y: rawPv.y / mag };

let targetTrackX = 0;
if (pv.x !== 0) {
  const nextCenter = (zyx.currentRow + 1) * pv.x * this.platformManager.gapY;
  const currentZyxX = zyx.x;
  targetTrackX = 0.30 * currentZyxX + 0.70 * nextCenter;
}
this.camera.update(dt, targetTrackX, logicalY);
```

### 3.2 Dynamic Verification
* **Weight Ratio (0.30 / 0.70):** Allocates 70% of horizontal authority to anticipating the upcoming question row (ensuring all 3 candidate platforms are presented early) while retaining 30% authority on player position (preventing Zyx from drifting out of view during jumps or recoveries).
* **Vertical Safety:** When `pv.x === 0`, `targetTrackX = 0`, maintaining exact behavioral fidelity with ZYX-00-R1 vertical tracking.

---

## 4. Test Harness Hardening: Strict Canvas Mock

### 4.1 Vulnerability Identified
The previous mock environment in `tests/mock_env.ts` utilized a permissive `Proxy` that accepted any method invocation and returned dummy values, masking invalid drawing arguments such as `NaN` or `Infinity`.

### 4.2 Hardening Implementation
`tests/mock_env.ts` now enforces numeric finite checks on all drawing and transformation methods:
* Methods audited: `arc`, `arcTo`, `ellipse`, `rect`, `fillRect`, `strokeRect`, `clearRect`, `moveTo`, `lineTo`, `bezierCurveTo`, `quadraticCurveTo`, `translate`, `scale`, `rotate`, `transform`, `setTransform`, `drawImage`, `fillText`, `strokeText`.
* Assertion: If `!Number.isFinite(val)` is detected on any geometric argument, the proxy immediately throws `[MOCK_CANVAS_CORRUPTION]` with full call context.
* Viewport isolation: Added `resetStandardViewport(canvas)` to deterministically reset the mock canvas to logical dimensions $500 \times 800$, offset $(0, 0)$.

---

## 5. Certification Suite Architecture & Results

### 5.1 Test Layer Overview
* **Layer 1:** `tests/torture_suite.ts` — ZYX-00 runtime torture suite (340 challenges, 27 sectors, 0 leaks, 0 freezes).
* **Layer 2:** `tests/config_authority_suite.ts` — Phase 2A centralized configuration authority suite (5 deep injection tests).
* **Layer 3:** `tests/player_path_suite.ts` — Phase 2A-R2 visual reachability and player-path certification (6 comprehensive gates).

### 5.2 Layer 3 Audit Gates (Player-Path Suite)
1. **Gate PR1 (Full-Depth Level Reachability & Candidate Visibility):**
   * Traversed 8 consecutive rows across all 4 database levels (`level_1`, `level_2`, `level_3`, `level_4`).
   * Decision Moment Invariant: Verified all 3 candidate platforms on every row satisfy:
     * Platform center is strictly within canvas bounds: $x \in [0, 500]$, $y \in [0, 800]$.
     * Usable visible dimensions are unclipped: visible width $\ge 30\text{ px}$, visible height $\ge 20\text{ px}$.
   * Status: **PASS** (100% option visibility across all rows).

2. **Gate PR1-B (Wrong-Answer Bounce & Recovery):**
   * Tested on diagonal levels (`level_3`, `level_4`).
   * Zyx correctly bounces back to starting platform on wrong tap, recovers stable state, and successfully advances on subsequent correct tap.
   * Status: **PASS**.

3. **Gate PR2 (Mathematical Coordinate Round-Trip Invariance):**
   * Tested across 5 distinct viewport configurations:
     1. Desktop Standard: $500 \times 800$, offset $(0, 0)$
     2. Mobile CSS: $375 \times 667$, offset $(20, 40)$
     3. iPhone Pro: $390 \times 844$, offset $(0, 0)$
     4. Tablet Scaled: $768 \times 1024$, offset $(100, 50)$
     5. Compact Android: $360 \times 740$, offset $(15, 30)$
   * World $\to$ Logical $\to$ Client $\to$ Inverted World round-trip error: $< 10^{-6}\text{ px}$.
   * Status: **PASS** (80 platforms certified).

4. **Gate PR3 (Strict Finite-Coordinate Audit):**
   * Checked across normal jumping, death/catastrophe animation, respawn, sector warp, and a 5000ms delta-time tab-switch spike.
   * Status: **PASS** (Zero non-finite numbers detected).

5. **Negative Regression Proof (ZYX-00-R1 Fixed-Camera Simulation):**
   * Starting from clean standard viewport $(0, 0, 500, 800)$, camera horizontal tracking is locked to 0 (`camera.x = 0`).
   * Result: Reliably fails at Row 1 or Row 2 (correct platform exits viewport at screen $X \ge 504.6\text{ px} > 500\text{ px}$).
   * Status: **PASS** (Defect reproduction verified).

6. **Gate PR4 (Zyx Visibility Invariant Across Full Lifecycle):**
   * Deliberately forced correct answers into:
     * Trailing outer lane ($\text{offset} = -1$)
     * Center lane ($\text{offset} = 0$)
     * Leading outer lane ($\text{offset} = +1$)
   * Checked across all 6 gameplay phases:
     1. Before jump
     2. Mid-jump ($t \approx 0.5$)
     3. Landing ($t = 1.0$)
     4. Post-landing camera settle
     5. Wrong-answer bounce arc
     6. Post-bounce recovery
   * Torso capsule bounds ($x: [-26, 26]$, $y: [-52, 0]$) confirmed to maintain visible intersection with the canvas.
   * Status: **PASS** (Zero off-screen drift).

---

## 6. Authority Distinction

In accordance with Phase 2A governance:
* **`ZYX-00-R1`** remains the historical pre-configuration runtime baseline.
* **`ZYX-2A-R2`** is the successor candidate containing centralized core runtime configuration plus corrected diagonal player-path geometry.
* **`jumpmath_v19.html`** remains a capability/recovery reference for functionality that has not yet been deliberately recovered, replaced, or retired.

Modular constants from `ZYX-00-R1` remain default behavioral authority unless deliberately altered and certified.
