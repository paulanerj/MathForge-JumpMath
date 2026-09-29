# JumpMath: Path of the Numerix
## Game Design Document (GDD) & Architecture Handoff
**Version:** 1.0 (Phase 2 Post-Mortem & Handoff)

### 1. High-Level Concept
**JumpMath: Path of the Numerix** is an educational, interstellar arcade game. The player controls **Zyx**, a Numerix-class cognitive entity, jumping between platforms by solving arithmetic sequences under time pressure. The core loop fuses fast-paced mental math with tight arcade physics, demanding both cognitive quickness and rhythm.

### 2. Core Gameplay Loop
*   **The Problem:** The player is presented with a mathematical pattern (e.g., skip counting by 3, summing to 10).
*   **The Action:** The player must tap the correct platform from a row of three before the timer expires or the encroaching Plasma Wave catches them.
*   **The Reward:** Landing on the correct platform advances Zyx, pushes the Wave back, builds the Combo meter, and triggers satisfying audiovisual feedback.
*   **The Penalty:** Jumping on a wrong platform causes Zyx to squash, get rejected, and arc backward to the previous platform. It breaks the Combo meter and loses precious time against the Wave.
*   **The Fail State:** The game ends if the Plasma Wave overtakes Zyx, or if the internal timer reaches zero (triggering a cataclysmic timeout death: Singularity, Wormhole, Detonation, or Orbital Strike).

### 3. Architecture & State Management
The application is built on a **React frontend** encapsulating a high-performance **HTML5 Canvas engine**. 

**Key Subsystems:**
*   `GameEngine.ts`: The central nervous system. Manages the main game loop (`requestAnimationFrame`), state mutations, delta-time updates, and coordinates all other systems.
*   `Renderer.ts`: The visual pipeline. Translates pure state into pixel operations. Strictly stateless; relies solely on what `GameEngine` passes to it. 
*   `MorticianAPI.ts`: The death sequencer. A dedicated module that handles complex, multi-phase failure animations (e.g., Snap Singularity, Wormhole). Keeps `GameEngine` clean from animation state bloat.
*   `PersonaController.ts`: Zyx's "brain". Observes game events (near misses, combo streaks, idle time) and drives his facial expressions, color palettes, and contextual dialogue (barks) without interfering with the core physics loop.
*   `CelestialBackground.ts`: The parallax world manager. Handles rendering starfields, nebulae, planets, and ambient debris dynamically.

### 4. Impact Grammar & Game Feel
The game adheres to a strict "Impact Grammar" to make the digital physics feel heavy and visceral:
*   **Hitstop:** Absolute freeze of the game state upon high-impact events (e.g., death, massive combo milestone) for 3-10 frames.
*   **Camera Shake:** Mathematical translation of the canvas coordinate system on both axes, decaying smoothly.
*   **Chromatic Split:** Separation of the red and cyan channels via `globalCompositeOperation` to simulate lens disruption.
*   **Screen Flash:** A momentary pure-white overlay to emphasize energy release.
*   **Anticipation (Time Dilation):** When the Plasma Wave approaches, time slows down to give the player a split-second to react before the final blow.

### 5. Roadmap to Production (PM Handoff)

**Phase 3: The Metagame & Progression**
*   **Missions & Sectors:** Implement a level progression system. Define distinct sectors (e.g., "The Foundation", "Deep Orbit") with escalating difficulty, different background themes, and unique mathematical modes.
*   **Persistent Storage:** Save high scores, highest streaks, and unlocked sectors using `localStorage` or a lightweight backend (Firebase).
*   **Visual Studio Inspector Polish:** Integrate the "Tuning Panel" allowing designers to tweak physics variables (gravity, jump height, timer decay) in real-time.

**Phase 4: Content & Edge Cases**
*   **More Math Modes:** Expand beyond basic arithmetic. Introduce modes for fractions, prime numbers, or algebraic substitutions.
*   **Accessibility:** Ensure the UI (HUD, Menus) meets WCAG standards. Add high-contrast modes or colorblind-friendly palettes.
*   **Performance Optimization:** Profile the canvas renderer. Ensure particle arrays are garbage collected properly and that off-screen elements are strictly culled.

**Phase 5: Audio & Juice**
*   **Dynamic Audio:** Implement an ambient drone that shifts pitch/intensity based on the proximity of the Plasma Wave.
*   **Flow State Visuals:** Enhance the "Quantum Flow" state (achieved after a 10x combo) with more pronounced screen effects, motion blur, and a driving heartbeat audio track.

### 6. Known Issues (Resolved in Patch 1.1)
*   **Resolved:** Addressed a severe matrix drift issue in `Renderer.ts` where un-restored `ctx.save()` calls caused the canvas to permanently shift leftward after screen shakes.
*   **Resolved:** Fixed an issue where Zyx's vaporized state (`voidAlpha = 0`) persisted through respawns. The `clearDeathStates()` method now properly resets all mortality flags on restart.
