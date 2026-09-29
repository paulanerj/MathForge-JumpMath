# ZYX-00-R1 — FREEZE MANIFEST & ARTIFACT INVENTORY

**Baseline Label:** `ZYX-00-R1 — FINAL ACCEPTANCE CANDIDATE`  
**Revision:** R1 (Freeze Integrity & Reproducibility Correction)  
**Certification Date:** September 18, 2026  
**Status:** **READY FOR FORMAL PM ACCEPTANCE**  
**Automated Verification:** 9-suite automated torture harness passed with 0 defects (`npm test`)

---

## 1. Executive Summary & Freeze Declaration

The modular implementation of the Zyx gameplay engine has successfully completed its freeze integrity correction under `ZYX-00-R1`. Following the forensic audit in Phase 0 and the P0 defect repairs in Phase 1A, the codebase underwent the **9-suite automated torture harness covering the 8 ZYX-00 certification gates (C1–C8) and their subordinate regression assertions**.

The core runtime has demonstrated zero crashes, zero desynchronizations, zero premature row advances, zero duplicate resolutions, and mathematically verified loop persistence across 340 consecutive challenges and 27 sector transitions.

---

## 2. Certified Execution Environment & Toolchain

The following environment produced the passing certification tests and is locked via `package-lock.json` for deterministic reconstruction:

| Component | Declared Specification | Actually Resolved Version |
| :--- | :--- | :--- |
| **Node.js Runtime** | Container Host | `v22.23.2` |
| **Package Manager** | Container Host | `npm 10.9.8` |
| **Vite Build Tool** | `^6.2.0` | `6.4.3` |
| **TypeScript Compiler** | `~5.8.2` | `5.8.3` |
| **TypeScript Execution (`tsx`)** | `^4.21.0` | `4.23.13` |
| **React** | `^19.0.0` | `19.3.0` |
| **React DOM** | `^19.0.0` | `19.3.0` |
| **Tailwind CSS** | `^4.1.14` | `4.3.3` |
| **@tailwindcss/vite** | `^4.1.14` | `4.3.3` |
| **Motion** | `^12.23.24` | `12.43.0` |
| **Express** | `^4.21.2` | `4.22.3` |
| **Lucide React** | `^0.546.0` | `0.546.0` |

Deterministic installation is reproducible via:
```bash
npm ci
```

---

## 3. Cryptographic SHA-256 Inventory

Every file in the certified runtime, test harness, configuration, and contract has been independently hashed via SHA-256:

### A. Runtime Authority Files (Source Code)

| File Path | SHA-256 Digest | Role / Subsystem |
| :--- | :--- | :--- |
| `src/App.tsx` | `84c07b6728c12d5408bac4ee63367d962ceef514e060f75ed2c6c60c0aa6792c` | React Host Component & Sector Orchestrator |
| `src/main.tsx` | `5580d48b0fec68698a113d45a640b88d479dc35eb1f4b87c51f67c6cc81cee9b` | Application Entry Point |
| `src/types.ts` | `7bf90b458d4c112397ddd3145e0fe4cc55622df45aac622c97876f13e72b49af` | Authoritative Type System & State Interfaces |
| `src/engine/GameEngine.ts` | `86d0f93474205b18d2e25ec8cb6b80ad008c1e76b6e0740746a2e1e1f564841e` | Core Authoritative Game & Animation Loop |
| `src/engine/PlatformManager.ts` | `0f93cdf582ec2d64b6ef1c384ea53b839e5ce6ff9024fbd9334150c757e08a8e` | Math Challenge & Platform Spawning |
| `src/engine/Renderer.ts` | `14a37ead5e057f5920fd9476a6ba92c919268e5b5431f89ea19df239c542cbe0` | Canvas 2D Rendering Engine & FX Compositor |
| `src/engine/Camera.ts` | `998567054f6e00106fe844b6b7f1c235a113227c314393836c056528580f476c` | Smooth Linear Interpolation Viewport Camera |
| `src/engine/AudioEngine.ts` | `1cdbcb5240dddbc56821e2ceb2b9fa4f1f9a15d58c34d6c4dc45bf9af0120a51` | Web Audio Synthesizer (BGM / SFX) |
| `src/engine/PersonaController.ts` | `0de11c4fec66b9041ba8d45fb47c979e7a9d38c4d26ea62325ff81a4460c01bf` | Zyx Persona, Dialog Barks & Mood State |
| `src/engine/MorticianAPI.ts` | `ae6182ab8f13c138f9e4324547b0472d41c35611d2d2eed3136c5454f7d7a13d` | Catastrophe Handler & Death Sequence State |
| `src/engine/LevelDatabase.ts` | `fceee6ac6adc435203d7210893086e74e78346856d2c029308f043edd8f32058` | Sector Level Schemas & Difficulty Configurations |

### B. Certification & Test Harness Files

| File Path | SHA-256 Digest | Role / Subsystem |
| :--- | :--- | :--- |
| `tests/torture_suite.ts` | `9a072a3533224bc746249449bf8d55261fe76e1b3fa47c12cf87439f63f080ab` | 9-Suite Automated Torture Harness |
| `tests/mock_env.ts` | `6a92faaf18b38bb3957b080e5eb55d924ffb9ac8e8a33f6130215af545fdd063` | Headless DOM, Canvas & RAF Instrumentation |

### C. Toolchain & Dependency Specifications

| File Path | SHA-256 Digest | Role / Subsystem |
| :--- | :--- | :--- |
| `package.json` | `3827028992a91a0cc7c9b67036c6eb0964b971277493cfc7cd7dc2d340af5b03` | Project Scripts & Dependency Declarations |
| `package-lock.json` | `be7807948cb493e5be227c0bea3e1df5e028fcaa31cbd24bbdb6cd496281b69f` | Authoritative Locked Dependency Tree |

### D. Governance & Contract Artifacts

| File Path | SHA-256 Digest | Role / Subsystem |
| :--- | :--- | :--- |
| `ZYX_00_REGRESSION_CONTRACT.md` | `127e148004ef8053908e2ed859d82c75a428fb6dfc994887a05f179d8b3c5ca9` | Non-Negotiable Invariants & Merge Gate |
| `PHASE_1B_CERTIFICATION_REPORT.md` | `5c2ff99282e7d23c9eb66212c8291ac68ef1315edaeef06facc73f0ce6e5c9c5` | Full Certification Test Report & Gates Assessment |

---

## 4. Source Authority Boundary

> **The modular implementation is the forward runtime authority beginning at `ZYX-00`. `jumpmath_v19.html` remains a recovery/reference authority for functionality identified in the Phase 0 recovery matrix until each capability is deliberately recovered, replaced, or retired.**

---

## 5. Scope Boundaries & Retained Technical Debt

The scope of `ZYX-00-R1` is strictly limited to establishing a robust, bug-free, and reproducible runtime core. The following items from the Phase 0 audit are deliberately preserved as deferred technical debt for structured recovery in subsequent commercialization phases:

1. **Centralized Configuration:** Config values (jump times, gravity, colors, speeds) remain distributed across engine files rather than unified in a centralized `CONFIG` schema.
2. **Advanced Math Distractors:** Distractor generation in `PlatformManager.ts` does not yet feature the full rule set from `v19` (such as off-by-one heuristics, digit reversal, and `skipDown` negative stepping).
3. **Catastrophe Death Varieties:** `MorticianAPI.ts` provides core void, wave, and wormhole handling; legacy variants (dimensional hotplate, laser grid) remain stubbed or simplified.
4. **Curriculum Expansion:** `LevelDatabase.ts` includes the introductory schema set; the broad primary-school math curriculum from `v19` remains to be imported.
5. **Developer Tooling:** Live configuration inspectors and JSON import/export from `v19` are not present in the modular runtime.

---

## 6. Reproducibility Verification Protocol

To verify this candidate from source:

```bash
# 1. Clean installation from lockfile
npm ci

# 2. Typecheck & Lint
npm run lint

# 3. Production Build
npm run build

# 4. Automated Torture Test Harness
npm test
```

All commands must exit with code `0`.
