# MATHFORGE

# SDK-COMPATIBLE SURFACE ARCHITECTURE & PRE-INTEGRATION STANDARD

## General guidance for new or external games that may later become MathForge surfaces

## 1. Purpose

This document describes how an independent game or learning surface should be structured if it may eventually be integrated into the MathForge platform.

The immediate objective is **not to implement the MathForge SDK**.

The objective is to create a game whose internal architecture cleanly separates:

**game-specific behavior**

from:

**platform/host responsibilities**

so that a future integration can follow approximately:

```
MathForge Host
        ↓
MathForge Surface SDK
        ↓
Thin Surface Adapter
        ↓
Surface-Local API
        ↓
Game / Learning Surface Core
```

The desired result is:

> MathForge can eventually attach to the game through a small, explicit boundary without rewriting the game's mathematics, gameplay, rendering system, or identity.

The surface should remain independently runnable during development.

---

# 2. Fundamental ownership rule

The game owns what makes it **the game**.

MathForge eventually owns what makes it **part of the platform**.

### Surface/game should own

The surface normally owns:

- mathematical/game rules;
- problem generation;
- correctness evaluation;
- game state;
- game-specific scoring;
- physics;
- movement;
- collision rules;
- board/grid topology;
- rendering;
- animations;
- game-specific audio semantics;
- game-specific effects;
- local interaction interpretation;
- internal state machines;
- game-specific progression;
- game-specific tuning;
- feasibility of generated mathematical situations.

### Future MathForge host should own

The platform will eventually own or coordinate concepts such as:

- learner identity;
- assignment/activity context;
- platform session context;
- mastery;
- educational history;
- platform XP/rewards;
- navigation between surfaces;
- platform-wide preferences;
- accessibility policy;
- persistence services where appropriate;
- analytics/evidence collection policy;
- activity completion policy;
- orchestration between surfaces.

Do not put these platform responsibilities deep inside the game.

---

# 3. Preserve a standalone game

A MathForge-compatible surface should still be capable of running independently.

Do not make the game require MathForge merely to:

- boot;
- display;
- generate a problem;
- accept input;
- evaluate an answer;
- animate;
- play audio;
- complete its local game loop.

During development there should ideally be a standalone wrapper providing local defaults.

Conceptually:

```
Standalone wrapper
        ↓
Surface-local API
        ↓
Game core
```

Later:

```
MathForge
   ↓
SDK
   ↓
Adapter
   ↓
Same surface-local API
   ↓
Same game core
```

The second path should not require replacing the game core.

---

# 4. Establish an explicit surface boundary

Avoid an application that can only be controlled through global variables, DOM events, or direct manipulation of internal objects.

Provide an explicit surface-level boundary.

The exact names do not need to match MathForge yet, but conceptually the game should support operations such as:

```
create
mount
configure/load activity
start
pause
resume
restart/reset
resize
destroy
```

Not every surface requires every operation internally.

The important principle is:

> External software should have a small, intentional way of controlling the surface without reaching into private implementation details.

Do **not** invent the final MathForge SDK interface merely to satisfy this recommendation.

---

# 5. Lifecycle ownership must be explicit

The surface must know what resources it owns.

For example:

- animation frames;
- timers;
- intervals;
- DOM listeners;
- window listeners;
- document listeners;
- pointer capture;
- observers;
- Web Audio nodes;
- audio contexts;
- workers;
- subscriptions;
- temporary DOM nodes;
- async callbacks.

`destroy()` should actually release surface-owned resources.

A useful acceptance sequence is:

```
create A
mount A
play A
destroy A

create B
mount B
play B
```

Instance B should not inherit stale runtime state from instance A.

Supporting two simultaneous instances is useful where appropriate but is **not automatically required**.

Sequential cleanliness is much more important.

---

# 6. Do not make resize a game reset

This has proven important in real surface integration work.

A container resize should normally affect:

- dimensions;
- projection;
- scale;
- layout;
- canvas resolution;
- responsive presentation.

It should **not automatically alter semantic game state**.

For example, changing the browser size should not unexpectedly erase:

- the current problem;
- score;
- accepted answers;
- board progress;
- learner attempts;
- current phase.

Conceptually:

```
resize
   ↓
layout / rendering recomputation
```

not:

```
resize
   ↓
reset game
   ↓
new mathematical state
```

If a particular game truly requires semantic regeneration after a resize, that should be an explicit documented product rule rather than an accidental consequence of implementation.

---

# 7. Keep the DOM/container scoped

The surface should behave like something that could eventually be embedded inside a larger MathForge page.

Avoid assumptions such as:

```
document.getElementById(...)
```

for internal surface elements when a surface container can be used instead.

Prefer conceptually:

```
surfaceRoot.querySelector(...)
```

Likewise, avoid global CSS such as:

```
body { ... }
html { ... }
button { ... }
canvas { ... }
```

when it unintentionally affects the host application.

Prefer a surface namespace/root:

```
.my-surface { ... }

.my-surface .toolbar { ... }

.my-surface canvas { ... }
```

The surface should not restyle unrelated host content.

---

# 8. Contain overlays

Dialogs, settings panels, help, developer panels, and other overlays should normally belong to the surface container.

Avoid making every game overlay:

```
position: fixed;
```

against the entire browser viewport unless full-viewport ownership is intentionally required.

An embeddable surface generally wants:

```
host page
 ├── unrelated content
 └── surface container
       ├── game
       └── game overlay
```

Opening the game settings should not obscure unrelated host UI unless MathForge explicitly chooses that behavior later.

---

# 9. Separate mathematical truth from presentation

This is one of the most important MathForge principles.

Do not make rendering the authority for mathematical state.

Prefer:

```
mathematical/domain state
        ↓
game state
        ↓
presentation
```

rather than determining correctness from:

- pixels;
- animation positions;
- DOM labels;
- sprite names;
- visual effects.

A renderer should represent truth established elsewhere.

This makes testing, adaptation, accessibility, alternate themes, and future host integration much safer.

---

# 10. Separate mathematical evaluation from physical realization

Many games have a delay between a mathematically meaningful action and its visual consequence.

For example:

```
learner commits answer
        ↓
mathematical evaluation
        ↓
correct
        ↓
animation begins
        ↓
object moves
        ↓
landing animation
```

The animation should not accidentally become the definition of correctness.

This matters especially in:

- physics games;
- puzzle games;
- tower games;
- path games;
- real-time games;
- drag-and-drop games.

MathForge may eventually need to know **when the mathematical attempt happened**, not merely when an animation finished.

---

# 11. Define problem identity

The game should have a coherent concept of a mathematical/problem opportunity.

A problem should not be identified solely by a transient DOM element or sprite.

Conceptually:

```
Problem Instance
    ├── Attempt 1
    ├── Attempt 2
    ├── Attempt 3
    └── Resolution
```

A surface may allow:

```
one problem → many attempts
```

or:

```
many simultaneous active problems
```

Both are legitimate.

MathForge should not force every surface into a one-question/one-answer model.

---

# 12. Distinguish input from an educational attempt

Not every user interaction is an answer.

Examples that may **not** constitute an educational attempt:

- pointer movement;
- dragging before release;
- camera movement;
- selecting an object;
- hovering;
- repositioning something;
- opening a menu;
- holding an object;
- canceling a gesture.

Define the point where the learner actually commits something for evaluation.

Conceptually:

```
RAW INPUT
    ↓
INTERPRETED GAME ACTION
    ↓
SEMANTIC COMMITMENT
    ↓
EVALUATED ATTEMPT
```

Only the appropriate layer should eventually become educational evidence.

---

# 13. Correctness and success are not necessarily identical

A mathematically correct action may not always complete a game objective.

For example:

```
mathematically correct
but
partial progress
```

or:

```
mathematically valid
but
strategically unsuccessful
```

Therefore avoid collapsing everything into:

```
correct: true/false
```

Internally distinguish where appropriate:

- mathematical correctness;
- problem effect;
- game consequence;
- problem resolution;
- local game progression.

This distinction becomes particularly valuable when MathForge eventually collects educational evidence.

---

# 14. Learner actions and system actions must be distinguishable

If the game can resolve something automatically, distinguish that from learner action.

Examples:

- auto-placement;
- timeout resolution;
- physics resolving an object;
- AI/bot action;
- scripted tutorial action;
- passive collision;
- automatic correction.

Do not attribute system-generated success or failure to the learner.

Conceptually:

```
learner committed
```

versus:

```
system resolved
```

should remain distinguishable.

---

# 15. Game score is not mastery

Keep these concepts separate:

```
GAME SCORE
```

```
EDUCATIONAL EVIDENCE
```

```
PLATFORM REWARD / XP
```

```
MASTERY
```

The surface may own its game score.

The future MathForge platform should determine mastery and platform-level educational interpretation.

Do not encode something like:

```
if (score > 500) learnerMasteredMultiplication = true;
```

inside the game.

---

# 16. Local completion is not automatically MathForge completion

A game may contain several completion concepts:

```
problem resolved
board complete
round complete
level complete
run complete
game over
results displayed
```

None automatically means:

```
MathForge activity complete
```

Preserve the distinctions.

A useful conceptual progression may be:

```
ACTIVE
   ↓
LOCAL TERMINAL CONDITION
   ↓
OUTCOME PRESENTATION
   ↓
RESULT READY
```

The future host can decide what that result means for its own activity/session.

---

# 17. Configuration should express semantic intent

Configuration supplied from outside the game should describe meaningful activity intent rather than private implementation knobs.

Good conceptual examples:

```
operation = multiplication
target = 12
numberRange = 1..12
unknownPosition = result
```

Poor external contracts would expose things such as:

```
enemyVelocityCoefficient = .827
nodeJitterThreshold = 14
internalGeneratorBranch = 3
```

Those can remain game tuning.

The host should tell the surface **what learning activity is requested**, not how every private algorithm must work.

---

# 18. Distinguish configuration categories

Do not put every configurable value into one giant settings object.

At minimum reason about:

### Pedagogical/activity configuration

Defines the learning activity.

Examples:

- operation;
- target;
- number range;
- unknown position;
- structural depth.

### Surface/game configuration

Defines game-specific behavior.

### User/local preferences

Examples:

- sound;
- presentation choices.

### Developer tuning

Examples:

- debug controls;
- physics coefficients;
- animation tuning.

### Future platform preferences

Examples could eventually include:

- reduced motion;
- audio policy;
- color scheme.

These categories have different owners and lifetimes.

---

# 19. Reject invalid pedagogical intent explicitly

This is especially important.

Suppose an external caller requests:

```
multiplication
target = X
```

but X cannot be generated fairly by the surface.

Do **not** silently replace X with Y and pretend the request succeeded.

Use the conceptual behavior:

```
request X
   ↓
validate
   ↓
REJECTED — infeasible
```

rather than:

```
request X
   ↓
X impossible
   ↓
silently use Y
   ↓
report success
```

Standalone defaults are different.

If **no external activity is supplied**, the game may choose its normal local defaults.

---

# 20. Requested, resolved, and realized difficulty are different

For future adaptive MathForge use, preserve the ability to distinguish:

### REQUESTED

What activity/configuration asked for.

### RESOLVED

What the generator actually accepted after feasibility and validation.

### REALIZED

What the learner actually experienced once timing, geometry, interaction, scaffolding, and presentation were applied.

Do not assume that requested configuration proves realized challenge.

This becomes important for adaptive difficulty later.

---

# 21. Capability is not permission

A game engine may technically support something without every activity allowing it.

Distinguish:

```
ENGINE CAPABILITY
```

from:

```
CURRENT ACTIVITY PERMISSION
```

from:

```
CURRENT RUNTIME AVAILABILITY
```

Example:

The engine may support division, but the assigned activity may permit only addition.

Likewise, a visible button does not prove that an option is mathematically available.

---

# 22. Mathematical feasibility may include physical feasibility

In some games it is not enough for a problem to be mathematically valid.

It may also need to be physically playable.

Examples:

- required target must be reachable;
- correct object must actually appear;
- geometry must permit the intended interaction;
- obstacles must not make the solution impossible;
- timing must permit reasonable completion.

Therefore generation may require:

```
mathematical validity
+
game/physical feasibility
```

A valid activity should produce a genuinely playable situation.

---

# 23. Persistence should be replaceable

Do not scatter direct calls to:

```
localStorage
```

throughout the game.

Prefer:

```
Game
 ↓
surface-local persistence abstraction
 ↓
standalone localStorage implementation
```

Later this can become:

```
Game
 ↓
surface-local persistence abstraction
 ↓
MathForge adapter
 ↓
platform persistence
```

without rewriting the game.

The standalone game can absolutely continue using localStorage.

The important point is dependency ownership.

---

# 24. Persistence failure must not destroy gameplay

Consider:

- storage unavailable;
- private/sandboxed environment;
- corrupted JSON;
- quota errors;
- read exception;
- write exception.

Where practical, gameplay should continue using safe defaults or non-persistent state.

A storage problem should not turn into a mathematical-game failure.

---

# 25. Keep developer persistence separate

Developer tuning data should not automatically become learner/platform persistence.

For example:

```
developer tuning
```

and:

```
learner activity state
```

have completely different meanings.

Keep those boundaries visible.

---

# 26. Audio has dual ownership

The surface should own its creative sound design:

- event sounds;
- musical identity;
- ambience;
- game-specific sonic feedback.

The future platform may own policy such as:

- audio enabled;
- mute;
- possibly broader accessibility/preferences.

Do not force all game audio composition into the platform.

Likewise, do not make it impossible for the platform eventually to request mute.

---

# 27. Avoid expensive startup work when possible

A surface should reach its first meaningful render quickly.

Avoid unnecessarily blocking initial mount with:

- expensive audio synthesis;
- large synchronous loops;
- unnecessary asset generation;
- work that could occur after first interaction;
- redundant navigation;
- unnecessary dev middleware.

This is not fundamentally an SDK contract, but good startup architecture makes surfaces substantially easier to host.

---

# 28. Separate domain RNG from cosmetic RNG

If randomness affects mathematical/game truth, make it reproducible where practical.

For example:

```
DOMAIN RNG
problem generation
board generation
game-state decisions
```

should ideally be separable from:

```
COSMETIC RNG
particles
sparkles
decorative movement
audio variation
```

Otherwise cosmetic changes can accidentally alter mathematical reproduction.

---

# 29. Provide deterministic QA/debug reproduction where useful

Normal gameplay can remain stochastic.

But debugging should ideally allow reproduction using appropriate information such as:

```
seed
configuration
initial state
input sequence
```

For real-time games, reproduction may additionally require:

```
input timeline
timestep schedule
```

Do not confuse deterministic QA with a requirement that normal play always be deterministic.

---

# 30. Rendering fallback must not change semantics

If a game can render through different mechanisms or quality levels, mathematical/game behavior should remain equivalent.

For example:

```
high-quality renderer
```

and:

```
fallback renderer
```

should not produce different correctness rules.

Presentation should represent semantic state, not redefine it.

---

# 31. Theme and accessibility must not alter mathematical truth

Future MathForge themes may substantially change presentation.

A theme may alter:

- colors;
- shapes;
- imagery;
- typography;
- animation;
- sound;
- layout within safe limits.

It must not silently alter:

- correct answer;
- operation;
- mathematical structure;
- attempt attribution;
- problem identity.

This separation is important for MathForge's longer-term presentation and SkinLab architecture.&#x20;

---

# 32. Input methods should converge on canonical actions

If a surface eventually supports:

- pointer;
- touch;
- keyboard;
- controller;
- accessibility input;

avoid implementing completely different mathematical logic for each.

Prefer:

```
pointer ──┐
touch ────┤
keyboard ─┼→ canonical surface action → domain/game logic
other ────┘
```

That helps preserve semantic equivalence across devices.

---

# 33. Domain invariants should not rely solely on the UI

The input layer can prevent invalid actions, but important game/domain invariants should generally have defensive enforcement closer to the domain authority as well.

For example:

```
UI prevents impossible move
```

is useful.

But if calling the underlying domain function directly with that impossible move causes a crash or corrupts state, the boundary is fragile.

Invalid domain operations should normally produce a safe semantic response such as:

```
NOOP
REJECTED
INVALID
```

rather than an exception caused by indexing nonexistent state.

---

# 34. Telemetry, evidence, and diagnostics are different

Keep conceptual categories separate.

### Educational evidence

Information describing meaningful learner-evaluated actions.

### Telemetry

Information useful for understanding gameplay/context/performance.

### Diagnostics

Information for developers and debugging.

### Presentation events

Information needed for animation/UI coordination.

Do not dump all four into one generic event stream and assume the platform can infer their meaning later.

---

# 35. Events should describe semantics, not implementation noise

Where the game exposes events, prefer meaningful concepts.

Potential conceptual examples:

```
problem-created
attempt-evaluated
problem-resolved
round-complete
result-ready
```

rather than forcing external consumers to reconstruct semantics from:

```
button-clicked
sprite-moved
animation-ended
```

Not every game needs these exact events.

The point is to expose meaningful boundaries where external integration eventually requires them.

---

# 36. Avoid global singleton assumptions where practical

Global modules are not automatically forbidden.

But avoid architecture where correctness depends on there being exactly one game forever.

At minimum ensure:

```
create
mount
destroy
create
mount
```

is clean.

If mutable module state exists, document and reset it appropriately.

Do not perform a massive rewrite merely to achieve theoretical simultaneous multi-instance support unless the product actually needs it.

---

# 37. Protect the game from the host

Host integration should not require the platform to manipulate:

- private reducer state;
- canvas internals;
- physics objects;
- internal generator arrays;
- DOM nodes;
- animation state.

Those should remain private.

The adapter should translate platform concepts into the surface's public/local seam.

---

# 38. Protect the host from the game

Likewise, the game should avoid uncontrolled ownership of:

- entire `document`;
- global CSS;
- browser navigation;
- global keyboard suppression;
- global pointer suppression;
- global storage;
- unowned window listeners;
- permanent timers;
- uncontrolled audio contexts.

A surface should behave like a responsible embedded component.

---

# 39. Build/package the actual game

A successful build command is not enough.

The production artifact must actually contain and run the surface.

Verify:

```
build exits successfully
        +
surface assets exist
        +
built output can be served
        +
surface boots from built output
        +
game is playable
```

This catches configurations where the build technically succeeds while omitting the actual game.

---

# 40. Test the built artifact, not only the development server

At minimum perform a production-build smoke test:

```
build
↓
serve dist
↓
load actual surface route
↓
render
↓
interact
↓
check console
```

Development-server success alone is insufficient.

---

# 41. Preserve a semantic regression suite

Once important behavior is established, protect it with tests.

A useful surface suite should cover:

- mathematical modes;
- correctness;
- incorrect attempts;
- problem progression;
- configuration;
- feasibility;
- game-specific penalties/recovery;
- completion;
- lifecycle;
- persistence;
- important known defects;
- host-neutral boundaries.

Do not write tests merely to increase the count.

Tests should establish meaningful behavior.

---

# 42. Keep known defects visible

A known defect does not need to be opportunistically repaired during unrelated architecture work.

Maintain a defect ledger.

Conceptually:

```
DEF-01 — REPRODUCED
DEF-02 — REPAIRED
DEF-03 — ACCEPTED DEBT
DEF-04 — CHANGED BY AUTHORIZED HARDENING
```

This prevents architectural refactoring from silently changing product behavior.

---

# 43. Freeze exact baselines

For serious integration work, identify exact candidate packages.

Record:

```
filename
byte count
SHA-256
file count
test results
build result
```

For example:

```
MySurface-Hardening-01.zip
Bytes: ...
SHA-256: ...
Files: ...
```

This prevents confusion about which version was actually reviewed.

---

# 44. Separate product authority from development candidates

A newer file is not automatically the product authority.

Useful classifications include:

```
FROZEN PRODUCT SOT

SUCCESSOR DEVELOPMENT BASELINE

HARDENING CANDIDATE

EVIDENCE PACKAGE

SDK ADAPTER CANDIDATE

PRODUCTION-INTEGRATION CANDIDATE
```

Do not collapse these into “latest version.”

---

# 45. Evidence before promotion

The development process should generally be:

```
coder creates candidate
        ↓
tests/evidence produced
        ↓
responsible PM/reviewer audits it
        ↓
candidate accepted
        ↓
baseline promoted
```

A coder should not simply declare its own package authoritative.

---

# 46. Do not prematurely implement the MathForge SDK

For a new external game, this is particularly important.

Until the SDK integration is actually authorized:

**do not:**

- copy SDK source into the game;
- invent SDK types;
- imitate SDK event names from memory;
- implement mastery;
- implement platform completion;
- invent MathForge learner identity;
- invent platform XP;
- hard-code MathForge navigation;
- build speculative platform persistence.

Build clean local seams first.

Then the real SDK can be attached deliberately.

---

# 47. Definition of HOST-NEUTRAL READY

A surface should be considered **HOST-NEUTRAL READY** when:

> A future MathForge adapter can connect through a thin translation layer without rewriting the surface's mathematical/game identity.

That generally means:

- clean lifecycle;
- clean container ownership;
- safe resize;
- explicit activity configuration;
- invalid intent rejection;
- replaceable persistence where needed;
- resource cleanup;
- mathematical/domain authority remains surface-owned;
- product semantics protected;
- build actually contains the surface;
- built output works;
- standalone operation remains intact.

It does **not** mean the SDK adapter already exists.

---

# 48. Definition of SDK ADAPTER READY

Only after host-neutral readiness should the project ask:

> Can the accepted MathForge SDK now be mapped onto the surface-local API with a genuinely thin adapter?

If the proposed adapter has to:

- rewrite mathematics;
- reach deeply into private state;
- reproduce half the game logic;
- patch lifecycle behavior;
- repair global ownership;
- infer attempts from animations;

then the surface probably was not truly host-neutral ready.

---

# 49. Desired final architecture

The preferred outcome is:

```
┌─────────────────────────────────────┐
│            MATHFORGE HOST           │
│                                     │
│ learner / assignment / mastery /    │
│ policy / navigation / platform      │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│       MATHFORGE SURFACE SDK         │
│                                     │
│ common platform/surface contract    │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│          THIN GAME ADAPTER          │
│                                     │
│ translation only                    │
│ no duplicated game logic            │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│       SURFACE-LOCAL BOUNDARY        │
│                                     │
│ lifecycle                           │
│ activity configuration              │
│ semantic actions/events             │
│ replaceable services                │
└──────────────────┬──────────────────┘
                   │
                   ▼
┌─────────────────────────────────────┐
│             GAME CORE               │
│                                     │
│ mathematics                         │
│ gameplay                            │
│ state                               │
│ physics                             │
│ rendering                           │
│ game score                          │
│ local progression                   │
└─────────────────────────────────────┘
```

The adapter should be boring.

That is a sign of success.

---

# 50. Practical pre-integration checklist

Before asking MathForge to integrate a new surface, the coder should be able to answer **YES** to most of these:

- Game runs standalone.
- Mathematical/game core is independent of host UI.
- Surface has an explicit local control boundary.
- Activity intent can be supplied explicitly.
- Invalid activity intent is rejected rather than silently replaced.
- Mathematical feasibility is validated.
- Input is distinguishable from evaluated attempts.
- Problem identity exists independently of transient visuals.
- Learner actions can be distinguished from automatic/system actions.
- Mathematical correctness is distinguishable from game consequences where needed.
- Game score is not treated as mastery.
- Local completion is not assumed to equal platform completion.
- Resize preserves semantic state unless explicitly designed otherwise.
- CSS is surface-contained.
- DOM lookups are surface-contained.
- Overlays are appropriately contained.
- Surface-owned global listeners are removable.
- Timers/RAF/audio/resources are cleaned up.
- Destroy/remount works.
- Sequential instances do not inherit stale runtime state.
- Persistence is isolated behind a replaceable boundary where applicable.
- Storage failure does not destroy gameplay.
- Developer tuning is distinguishable from learner/platform persistence.
- Domain invariants do not depend solely on perfect UI behavior.
- Domain randomness can be reproduced for QA where useful.
- Cosmetic randomness does not control mathematical truth.
- Themes/presentation cannot change correctness.
- Production build includes the actual game.
- Built artifact has been independently booted and played.
- Semantic regression tests exist.
- Known defects are recorded rather than silently changed.
- Exact accepted candidate identity can be reproduced.
- No speculative MFS SDK implementation has been embedded.

---

# 51. What the coder should provide when the game is ready for MathForge review

Prepare a **Surface Capability & Integration Dossier** containing:

1. exact game/candidate identity;
2. repository/workspace identity;
3. build instructions;
4. standalone launch instructions;
5. mathematical modes/rules;
6. problem-generation architecture;
7. problem identity;
8. attempt semantics;
9. correctness semantics;
10. resolution semantics;
11. local completion semantics;
12. scoring semantics;
13. input methods;
14. lifecycle architecture;
15. configuration model;
16. mathematical feasibility rules;
17. persistence architecture;
18. audio ownership;
19. rendering architecture;
20. DOM/CSS containment;
21. resource/listener ownership;
22. RNG/determinism architecture;
23. telemetry available;
24. potential educational evidence available;
25. system-vs-learner attribution;
26. known defects;
27. known architectural debt;
28. automated test inventory/results;
29. browser/device acceptance results;
30. production-build results;
31. exact package bytes/SHA-256/file count;
32. proposed surface-local integration seam;
33. anything that would currently prevent a thin adapter.

Then **stop**.

Do not create the MathForge adapter until the MathForge SDK program reviews the dossier and authorizes integration.

---

## Governing principle for the new game's coder

If I reduced the entire document to one rule, it would be:

> **Build the game as a clean, self-contained product with explicit semantic boundaries. Do not build MathForge into it. Build it so MathForge can later connect to it without changing what the game fundamentally is.**

That is the architecture we want across very different MathForge games. It lets us have a physics game, number-line game, puzzle, shooter, tower, spatial manipulation game, or something we have not conceived yet without forcing them all to become the same application internally.

Give me please the entire response that you just gave me in a copy paste, friendly format. I’m on my cell phone so I can’t copy the codes that ChatGPT sometimes gives.

Yes. Below is the **same complete document in plain copy/paste-friendly text**, with no code windows.

MATHFORGE

SDK-COMPATIBLE SURFACE ARCHITECTURE & PRE-INTEGRATION STANDARD

General guidance for new or external games that may later become MathForge surfaces

1. PURPOSE

This document describes how an independent game or learning surface should be structured if it may eventually be integrated into the MathForge platform.

The immediate objective is NOT to implement the MathForge SDK.

The objective is to create a game whose internal architecture cleanly separates:

GAME-SPECIFIC BEHAVIOR

from:

PLATFORM/HOST RESPONSIBILITIES

so that a future integration can follow approximately:

MathForge Host\
↓\
MathForge Surface SDK\
↓\
Thin Surface Adapter\
↓\
Surface-Local API\
↓\
Game / Learning Surface Core

The desired result is:

MathForge can eventually attach to the game through a small, explicit boundary without rewriting the game's mathematics, gameplay, rendering system, or identity.

The surface should remain independently runnable during development.

2. FUNDAMENTAL OWNERSHIP RULE

The game owns what makes it THE GAME.

MathForge eventually owns what makes it PART OF THE PLATFORM.

SURFACE/GAME SHOULD OWN

The surface normally owns:

- mathematical/game rules;
- problem generation;
- correctness evaluation;
- game state;
- game-specific scoring;
- physics;
- movement;
- collision rules;
- board/grid topology;
- rendering;
- animations;
- game-specific audio semantics;
- game-specific effects;
- local interaction interpretation;
- internal state machines;
- game-specific progression;
- game-specific tuning;
- feasibility of generated mathematical situations.

FUTURE MATHFORGE HOST SHOULD OWN

The platform will eventually own or coordinate concepts such as:

- learner identity;
- assignment/activity context;
- platform session context;
- mastery;
- educational history;
- platform XP/rewards;
- navigation between surfaces;
- platform-wide preferences;
- accessibility policy;
- persistence services where appropriate;
- analytics/evidence collection policy;
- activity completion policy;
- orchestration between surfaces.

Do not put these platform responsibilities deep inside the game.

3. PRESERVE A STANDALONE GAME

A MathForge-compatible surface should still be capable of running independently.

Do not make the game require MathForge merely to:

- boot;
- display;
- generate a problem;
- accept input;
- evaluate an answer;
- animate;
- play audio;
- complete its local game loop.

During development there should ideally be a standalone wrapper providing local defaults.

Conceptually:

Standalone wrapper\
↓\
Surface-local API\
↓\
Game core

Later:

MathForge\
↓\
SDK\
↓\
Adapter\
↓\
Same surface-local API\
↓\
Same game core

The second path should not require replacing the game core.

4. ESTABLISH AN EXPLICIT SURFACE BOUNDARY

Avoid an application that can only be controlled through global variables, DOM events, or direct manipulation of internal objects.

Provide an explicit surface-level boundary.

The exact names do not need to match MathForge yet, but conceptually the game should support operations such as:

create\
mount\
configure/load activity\
start\
pause\
resume\
restart/reset\
resize\
destroy

Not every surface requires every operation internally.

The important principle is:

External software should have a small, intentional way of controlling the surface without reaching into private implementation details.

Do NOT invent the final MathForge SDK interface merely to satisfy this recommendation.

5. LIFECYCLE OWNERSHIP MUST BE EXPLICIT

The surface must know what resources it owns.

For example:

- animation frames;
- timers;
- intervals;
- DOM listeners;
- window listeners;
- document listeners;
- pointer capture;
- observers;
- Web Audio nodes;
- audio contexts;
- workers;
- subscriptions;
- temporary DOM nodes;
- async callbacks.

destroy() should actually release surface-owned resources.

A useful acceptance sequence is:

create A\
mount A\
play A\
destroy A

create B\
mount B\
play B

Instance B should not inherit stale runtime state from instance A.

Supporting two simultaneous instances is useful where appropriate but is NOT automatically required.

Sequential cleanliness is much more important.

6. DO NOT MAKE RESIZE A GAME RESET

This has proven important in real surface integration work.

A container resize should normally affect:

- dimensions;
- projection;
- scale;
- layout;
- canvas resolution;
- responsive presentation.

It should NOT automatically alter semantic game state.

For example, changing the browser size should not unexpectedly erase:

- the current problem;
- score;
- accepted answers;
- board progress;
- learner attempts;
- current phase.

Conceptually:

resize\
↓\
layout / rendering recomputation

NOT:

resize\
↓\
reset game\
↓\
new mathematical state

If a particular game truly requires semantic regeneration after a resize, that should be an explicit documented product rule rather than an accidental consequence of implementation.

7. KEEP THE DOM/CONTAINER SCOPED

The surface should behave like something that could eventually be embedded inside a larger MathForge page.

Avoid assumptions such as global document lookups for internal surface elements when a surface container can be used instead.

Prefer querying within the surface root.

Likewise, avoid global CSS rules against body, html, button, canvas, etc. when they unintentionally affect the host application.

Prefer a surface namespace/root.

For example:

.my-surface

.my-surface .toolbar

.my-surface canvas

The surface should not restyle unrelated host content.

8. CONTAIN OVERLAYS

Dialogs, settings panels, help, developer panels, and other overlays should normally belong to the surface container.

Avoid making every game overlay fixed against the entire browser viewport unless full-viewport ownership is intentionally required.

An embeddable surface generally wants:

host page\
├── unrelated content\
└── surface container\
&#x20;   ├── game\
&#x20;   └── game overlay

Opening the game settings should not obscure unrelated host UI unless MathForge explicitly chooses that behavior later.

9. SEPARATE MATHEMATICAL TRUTH FROM PRESENTATION

This is one of the most important MathForge principles.

Do not make rendering the authority for mathematical state.

Prefer:

mathematical/domain state\
↓\
game state\
↓\
presentation

rather than determining correctness from:

- pixels;
- animation positions;
- DOM labels;
- sprite names;
- visual effects.

A renderer should represent truth established elsewhere.

This makes testing, adaptation, accessibility, alternate themes, and future host integration much safer.

10. SEPARATE MATHEMATICAL EVALUATION FROM PHYSICAL REALIZATION

Many games have a delay between a mathematically meaningful action and its visual consequence.

For example:

learner commits answer\
↓\
mathematical evaluation\
↓\
correct\
↓\
animation begins\
↓\
object moves\
↓\
landing animation

The animation should not accidentally become the definition of correctness.

This matters especially in:

- physics games;
- puzzle games;
- tower games;
- path games;
- real-time games;
- drag-and-drop games.

MathForge may eventually need to know WHEN the mathematical attempt happened, not merely when an animation finished.

11. DEFINE PROBLEM IDENTITY

The game should have a coherent concept of a mathematical/problem opportunity.

A problem should not be identified solely by a transient DOM element or sprite.

Conceptually:

Problem Instance\
├── Attempt 1\
├── Attempt 2\
├── Attempt 3\
└── Resolution

A surface may allow:

one problem → many attempts

or:

many simultaneous active problems

Both are legitimate.

MathForge should not force every surface into a one-question/one-answer model.

12. DISTINGUISH INPUT FROM AN EDUCATIONAL ATTEMPT

Not every user interaction is an answer.

Examples that may NOT constitute an educational attempt:

- pointer movement;
- dragging before release;
- camera movement;
- selecting an object;
- hovering;
- repositioning something;
- opening a menu;
- holding an object;
- canceling a gesture.

Define the point where the learner actually commits something for evaluation.

Conceptually:

RAW INPUT\
↓\
INTERPRETED GAME ACTION\
↓\
SEMANTIC COMMITMENT\
↓\
EVALUATED ATTEMPT

Only the appropriate layer should eventually become educational evidence.

13. CORRECTNESS AND SUCCESS ARE NOT NECESSARILY IDENTICAL

A mathematically correct action may not always complete a game objective.

For example:

mathematically correct\
but\
partial progress

or:

mathematically valid\
but\
strategically unsuccessful

Therefore avoid collapsing everything into:

correct: true/false

Internally distinguish where appropriate:

- mathematical correctness;
- problem effect;
- game consequence;
- problem resolution;
- local game progression.

This distinction becomes particularly valuable when MathForge eventually collects educational evidence.

14. LEARNER ACTIONS AND SYSTEM ACTIONS MUST BE DISTINGUISHABLE

If the game can resolve something automatically, distinguish that from learner action.

Examples:

- auto-placement;
- timeout resolution;
- physics resolving an object;
- AI/bot action;
- scripted tutorial action;
- passive collision;
- automatic correction.

Do not attribute system-generated success or failure to the learner.

Conceptually:

LEARNER COMMITTED

versus:

SYSTEM RESOLVED

should remain distinguishable.

15. GAME SCORE IS NOT MASTERY

Keep these concepts separate:

GAME SCORE

EDUCATIONAL EVIDENCE

PLATFORM REWARD / XP

MASTERY

The surface may own its game score.

The future MathForge platform should determine mastery and platform-level educational interpretation.

Do not encode rules such as:

"If score is greater than 500, learner has mastered multiplication"

inside the game.

16. LOCAL COMPLETION IS NOT AUTOMATICALLY MATHFORGE COMPLETION

A game may contain several completion concepts:

problem resolved\
board complete\
round complete\
level complete\
run complete\
game over\
results displayed

None automatically means:

MathForge activity complete

Preserve the distinctions.

A useful conceptual progression may be:

ACTIVE\
↓\
LOCAL TERMINAL CONDITION\
↓\
OUTCOME PRESENTATION\
↓\
RESULT READY

The future host can decide what that result means for its own activity/session.

17. CONFIGURATION SHOULD EXPRESS SEMANTIC INTENT

Configuration supplied from outside the game should describe meaningful activity intent rather than private implementation knobs.

Good conceptual examples:

operation = multiplication\
target = 12\
numberRange = 1..12\
unknownPosition = result

Poor external contracts would expose things such as:

enemyVelocityCoefficient = .827\
nodeJitterThreshold = 14\
internalGeneratorBranch = 3

Those can remain game tuning.

The host should tell the surface WHAT learning activity is requested, not how every private algorithm must work.

18. DISTINGUISH CONFIGURATION CATEGORIES

Do not put every configurable value into one giant settings object.

At minimum reason about:

PEDAGOGICAL / ACTIVITY CONFIGURATION

Defines the learning activity.

Examples:

- operation;
- target;
- number range;
- unknown position;
- structural depth.

SURFACE / GAME CONFIGURATION

Defines game-specific behavior.

USER / LOCAL PREFERENCES

Examples:

- sound;
- presentation choices.

DEVELOPER TUNING

Examples:

- debug controls;
- physics coefficients;
- animation tuning.

FUTURE PLATFORM PREFERENCES

Examples could eventually include:

- reduced motion;
- audio policy;
- color scheme.

These categories have different owners and lifetimes.

19. REJECT INVALID PEDAGOGICAL INTENT EXPLICITLY

This is especially important.

Suppose an external caller requests:

multiplication\
target = X

but X cannot be generated fairly by the surface.

Do NOT silently replace X with Y and pretend the request succeeded.

Use the conceptual behavior:

request X\
↓\
validate\
↓\
REJECTED — infeasible

rather than:

request X\
↓\
X impossible\
↓\
silently use Y\
↓\
report success

Standalone defaults are different.

If NO external activity is supplied, the game may choose its normal local defaults.

20. REQUESTED, RESOLVED, AND REALIZED DIFFICULTY ARE DIFFERENT

For future adaptive MathForge use, preserve the ability to distinguish:

REQUESTED

What activity/configuration asked for.

RESOLVED

What the generator actually accepted after feasibility and validation.

REALIZED

What the learner actually experienced once timing, geometry, interaction, scaffolding, and presentation were applied.

Do not assume that requested configuration proves realized challenge.

This becomes important for adaptive difficulty later.

21. CAPABILITY IS NOT PERMISSION

A game engine may technically support something without every activity allowing it.

Distinguish:

ENGINE CAPABILITY

from:

CURRENT ACTIVITY PERMISSION

from:

CURRENT RUNTIME AVAILABILITY

Example:

The engine may support division, but the assigned activity may permit only addition.

Likewise, a visible button does not prove that an option is mathematically available.

22. MATHEMATICAL FEASIBILITY MAY INCLUDE PHYSICAL FEASIBILITY

In some games it is not enough for a problem to be mathematically valid.

It may also need to be physically playable.

Examples:

- required target must be reachable;
- correct object must actually appear;
- geometry must permit the intended interaction;
- obstacles must not make the solution impossible;
- timing must permit reasonable completion.

Therefore generation may require:

mathematical validity\
+\
game/physical feasibility

A valid activity should produce a genuinely playable situation.

23. PERSISTENCE SHOULD BE REPLACEABLE

Do not scatter direct calls to localStorage throughout the game.

Prefer:

Game\
↓\
surface-local persistence abstraction\
↓\
standalone localStorage implementation

Later this can become:

Game\
↓\
surface-local persistence abstraction\
↓\
MathForge adapter\
↓\
platform persistence

without rewriting the game.

The standalone game can absolutely continue using localStorage.

The important point is dependency ownership.

24. PERSISTENCE FAILURE MUST NOT DESTROY GAMEPLAY

Consider:

- storage unavailable;
- private/sandboxed environment;
- corrupted JSON;
- quota errors;
- read exception;
- write exception.

Where practical, gameplay should continue using safe defaults or non-persistent state.

A storage problem should not turn into a mathematical-game failure.

25. KEEP DEVELOPER PERSISTENCE SEPARATE

Developer tuning data should not automatically become learner/platform persistence.

For example:

DEVELOPER TUNING

and:

LEARNER ACTIVITY STATE

have completely different meanings.

Keep those boundaries visible.

26. AUDIO HAS DUAL OWNERSHIP

The surface should own its creative sound design:

- event sounds;
- musical identity;
- ambience;
- game-specific sonic feedback.

The future platform may own policy such as:

- audio enabled;
- mute;
- possibly broader accessibility/preferences.

Do not force all game audio composition into the platform.

Likewise, do not make it impossible for the platform eventually to request mute.

27. AVOID EXPENSIVE STARTUP WORK WHEN POSSIBLE

A surface should reach its first meaningful render quickly.

Avoid unnecessarily blocking initial mount with:

- expensive audio synthesis;
- large synchronous loops;
- unnecessary asset generation;
- work that could occur after first interaction;
- redundant navigation;
- unnecessary development middleware.

This is not fundamentally an SDK contract, but good startup architecture makes surfaces substantially easier to host.

28. SEPARATE DOMAIN RNG FROM COSMETIC RNG

If randomness affects mathematical/game truth, make it reproducible where practical.

For example:

DOMAIN RNG

- problem generation;
- board generation;
- game-state decisions.

This should ideally be separable from:

COSMETIC RNG

- particles;
- sparkles;
- decorative movement;
- audio variation.

Otherwise cosmetic changes can accidentally alter mathematical reproduction.

29. PROVIDE DETERMINISTIC QA/DEBUG REPRODUCTION WHERE USEFUL

Normal gameplay can remain stochastic.

But debugging should ideally allow reproduction using appropriate information such as:

seed\
configuration\
initial state\
input sequence

For real-time games, reproduction may additionally require:

input timeline\
timestep schedule

Do not confuse deterministic QA with a requirement that normal play always be deterministic.

30. RENDERING FALLBACK MUST NOT CHANGE SEMANTICS

If a game can render through different mechanisms or quality levels, mathematical/game behavior should remain equivalent.

For example:

HIGH-QUALITY RENDERER

and:

FALLBACK RENDERER

should not produce different correctness rules.

Presentation should represent semantic state, not redefine it.

31. THEME AND ACCESSIBILITY MUST NOT ALTER MATHEMATICAL TRUTH

Future MathForge themes may substantially change presentation.

A theme may alter:

- colors;
- shapes;
- imagery;
- typography;
- animation;
- sound;
- layout within safe limits.

It must not silently alter:

- correct answer;
- operation;
- mathematical structure;
- attempt attribution;
- problem identity.

This separation is important for MathForge's longer-term presentation and SkinLab architecture.

32. INPUT METHODS SHOULD CONVERGE ON CANONICAL ACTIONS

If a surface eventually supports:

pointer\
touch\
keyboard\
controller\
accessibility input

avoid implementing completely different mathematical logic for each.

Prefer:

pointer ──┐\
touch ────┤\
keyboard ─┼→ canonical surface action → domain/game logic\
other ────┘

That helps preserve semantic equivalence across devices.

33. DOMAIN INVARIANTS SHOULD NOT RELY SOLELY ON THE UI

The input layer can prevent invalid actions, but important game/domain invariants should generally have defensive enforcement closer to the domain authority as well.

For example:

UI prevents impossible move

is useful.

But if calling the underlying domain function directly with that impossible move causes a crash or corrupts state, the boundary is fragile.

Invalid domain operations should normally produce a safe semantic response such as:

NOOP

REJECTED

INVALID

rather than an exception caused by indexing nonexistent state.

34. TELEMETRY, EVIDENCE, AND DIAGNOSTICS ARE DIFFERENT

Keep conceptual categories separate.

EDUCATIONAL EVIDENCE

Information describing meaningful learner-evaluated actions.

TELEMETRY

Information useful for understanding gameplay/context/performance.

DIAGNOSTICS

Information for developers and debugging.

PRESENTATION EVENTS

Information needed for animation/UI coordination.

Do not dump all four into one generic event stream and assume the platform can infer their meaning later.

35. EVENTS SHOULD DESCRIBE SEMANTICS, NOT IMPLEMENTATION NOISE

Where the game exposes events, prefer meaningful concepts.

Potential conceptual examples:

problem-created

attempt-evaluated

problem-resolved

round-complete

result-ready

rather than forcing external consumers to reconstruct semantics from:

button-clicked

sprite-moved

animation-ended

Not every game needs these exact events.

The point is to expose meaningful boundaries where external integration eventually requires them.

36. AVOID GLOBAL SINGLETON ASSUMPTIONS WHERE PRACTICAL

Global modules are not automatically forbidden.

But avoid architecture where correctness depends on there being exactly one game forever.

At minimum ensure:

create\
mount\
destroy\
create\
mount

is clean.

If mutable module state exists, document and reset it appropriately.

Do not perform a massive rewrite merely to achieve theoretical simultaneous multi-instance support unless the product actually needs it.

37. PROTECT THE GAME FROM THE HOST

Host integration should not require the platform to manipulate:

- private reducer state;
- canvas internals;
- physics objects;
- internal generator arrays;
- DOM nodes;
- animation state.

Those should remain private.

The adapter should translate platform concepts into the surface's public/local seam.

38. PROTECT THE HOST FROM THE GAME

Likewise, the game should avoid uncontrolled ownership of:

- entire document;
- global CSS;
- browser navigation;
- global keyboard suppression;
- global pointer suppression;
- global storage;
- unowned window listeners;
- permanent timers;
- uncontrolled audio contexts.

A surface should behave like a responsible embedded component.

39. BUILD/PACKAGE THE ACTUAL GAME

A successful build command is not enough.

The production artifact must actually contain and run the surface.

Verify:

build exits successfully\
+\
surface assets exist\
+\
built output can be served\
+\
surface boots from built output\
+\
game is playable

This catches configurations where the build technically succeeds while omitting the actual game.

40. TEST THE BUILT ARTIFACT, NOT ONLY THE DEVELOPMENT SERVER

At minimum perform a production-build smoke test:

build\
↓\
serve dist\
↓\
load actual surface route\
↓\
render\
↓\
interact\
↓\
check console

Development-server success alone is insufficient.

41. PRESERVE A SEMANTIC REGRESSION SUITE

Once important behavior is established, protect it with tests.

A useful surface suite should cover:

- mathematical modes;
- correctness;
- incorrect attempts;
- problem progression;
- configuration;
- feasibility;
- game-specific penalties/recovery;
- completion;
- lifecycle;
- persistence;
- important known defects;
- host-neutral boundaries.

Do not write tests merely to increase the count.

Tests should establish meaningful behavior.

42. KEEP KNOWN DEFECTS VISIBLE

A known defect does not need to be opportunistically repaired during unrelated architecture work.

Maintain a defect ledger.

Conceptually:

DEF-01 — REPRODUCED

DEF-02 — REPAIRED

DEF-03 — ACCEPTED DEBT

DEF-04 — CHANGED BY AUTHORIZED HARDENING

This prevents architectural refactoring from silently changing product behavior.

43. FREEZE EXACT BASELINES

For serious integration work, identify exact candidate packages.

Record:

filename

byte count

SHA-256

file count

test results

build result

For example:

MySurface-Hardening-01.zip

Bytes: ...

SHA-256: ...

Files: ...

This prevents confusion about which version was actually reviewed.

44. SEPARATE PRODUCT AUTHORITY FROM DEVELOPMENT CANDIDATES

A newer file is not automatically the product authority.

Useful classifications include:

FROZEN PRODUCT SOT

SUCCESSOR DEVELOPMENT BASELINE

HARDENING CANDIDATE

EVIDENCE PACKAGE

SDK ADAPTER CANDIDATE

PRODUCTION-INTEGRATION CANDIDATE

Do not collapse these into "latest version."

45. EVIDENCE BEFORE PROMOTION

The development process should generally be:

coder creates candidate\
↓\
tests/evidence produced\
↓\
responsible PM/reviewer audits it\
↓\
candidate accepted\
↓\
baseline promoted

A coder should not simply declare its own package authoritative.

46. DO NOT PREMATURELY IMPLEMENT THE MATHFORGE SDK

For a new external game, this is particularly important.

Until the SDK integration is actually authorized:

DO NOT:

- copy SDK source into the game;
- invent SDK types;
- imitate SDK event names from memory;
- implement mastery;
- implement platform completion;
- invent MathForge learner identity;
- invent platform XP;
- hard-code MathForge navigation;
- build speculative platform persistence.

Build clean local seams first.

Then the real SDK can be attached deliberately.

47. DEFINITION OF HOST-NEUTRAL READY

A surface should be considered HOST-NEUTRAL READY when:

A future MathForge adapter can connect through a thin translation layer without rewriting the surface's mathematical/game identity.

That generally means:

- clean lifecycle;
- clean container ownership;
- safe resize;
- explicit activity configuration;
- invalid intent rejection;
- replaceable persistence where needed;
- resource cleanup;
- mathematical/domain authority remains surface-owned;
- product semantics protected;
- build actually contains the surface;
- built output works;
- standalone operation remains intact.

It does NOT mean the SDK adapter already exists.

48. DEFINITION OF SDK ADAPTER READY

Only after host-neutral readiness should the project ask:

Can the accepted MathForge SDK now be mapped onto the surface-local API with a genuinely thin adapter?

If the proposed adapter has to:

- rewrite mathematics;
- reach deeply into private state;
- reproduce half the game logic;
- patch lifecycle behavior;
- repair global ownership;
- infer attempts from animations;

then the surface probably was not truly host-neutral ready.

49. DESIRED FINAL ARCHITECTURE

The preferred outcome is:

MATHFORGE HOST

Learner / assignment / mastery / policy / navigation / platform

↓

MATHFORGE SURFACE SDK

Common platform/surface contract

↓

THIN GAME ADAPTER

Translation only.

No duplicated game logic.

↓

SURFACE-LOCAL BOUNDARY

Lifecycle

Activity configuration

Semantic actions/events

Replaceable services

↓

GAME CORE

Mathematics

Gameplay

State

Physics

Rendering

Game score

Local progression

The adapter should be boring.

That is a sign of success.

50. PRACTICAL PRE-INTEGRATION CHECKLIST

Before asking MathForge to integrate a new surface, the coder should be able to answer YES to most of these:

- Game runs standalone.
- Mathematical/game core is independent of host UI.
- Surface has an explicit local control boundary.
- Activity intent can be supplied explicitly.
- Invalid activity intent is rejected rather than silently replaced.
- Mathematical feasibility is validated.
- Input is distinguishishable from evaluated attempts.
- Problem identity exists independently of transient visuals.
- Learner actions can be distinguished from automatic/system actions.
- Mathematical correctness is distinguishable from game consequences where needed.
- Game score is not treated as mastery.
- Local completion is not assumed to equal platform completion.
- Resize preserves semantic state unless explicitly designed otherwise.
- CSS is surface-contained.
- DOM lookups are surface-contained.
- Overlays are appropriately contained.
- Surface-owned global listeners are removable.
- Timers/RAF/audio/resources are cleaned up.
- Destroy/remount works.
- Sequential instances do not inherit stale runtime state.
- Persistence is isolated behind a replaceable boundary where applicable.
- Storage failure does not destroy gameplay.
- Developer tuning is distinguishable from learner/platform persistence.
- Domain invariants do not depend solely on perfect UI behavior.
- Domain randomness can be reproduced for QA where useful.
- Cosmetic randomness does not control mathematical truth.
- Themes/presentation cannot change correctness.
- Production build includes the actual game.
- Built artifact has been independently booted and played.
- Semantic regression tests exist.
- Known defects are recorded rather than silently changed.
- Exact accepted candidate identity can be reproduced.
- No speculative MFS SDK implementation has been embedded.

51. WHAT THE CODER SHOULD PROVIDE WHEN THE GAME IS READY FOR MATHFORGE REVIEW

Prepare a:

SURFACE CAPABILITY & INTEGRATION DOSSIER

containing:

1. exact game/candidate identity;
2. repository/workspace identity;
3. build instructions;
4. standalone launch instructions;
5. mathematical modes/rules;
6. problem-generation architecture;
7. problem identity;
8. attempt semantics;
9. correctness semantics;
10. resolution semantics;
11. local completion semantics;
12. scoring semantics;
13. input methods;
14. lifecycle architecture;
15. configuration model;
16. mathematical feasibility rules;
17. persistence architecture;
18. audio ownership;
19. rendering architecture;
20. DOM/CSS containment;
21. resource/listener ownership;
22. RNG/determinism architecture;
23. telemetry available;
24. potential educational evidence available;
25. system-vs-learner attribution;
26. known defects;
27. known architectural debt;
28. automated test inventory/results;
29. browser/device acceptance results;
30. production-build results;
31. exact package bytes/SHA-256/file count;
32. proposed surface-local integration seam;
33. anything that would currently prevent a thin adapter.

Then STOP.

Do not create the MathForge adapter until the MathForge SDK program reviews the dossier and authorizes integration.

GOVERNING PRINCIPLE FOR THE NEW GAME'S CODER

If the entire document were reduced to one rule, it would be:

BUILD THE GAME AS A CLEAN, SELF-CONTAINED PRODUCT WITH EXPLICIT SEMANTIC BOUNDARIES.

DO NOT BUILD MATHFORGE INTO IT.

BUILD IT SO MATHFORGE CAN LATER CONNECT TO IT WITHOUT CHANGING WHAT THE GAME FUNDAMENTALLY IS.

That is the architecture we want across very different MathForge games.

It lets MathForge support a physics game, number-line game, puzzle, shooter, tower, spatial manipulation game, or something we have not conceived yet without forcing all of those games to become the same application internally.