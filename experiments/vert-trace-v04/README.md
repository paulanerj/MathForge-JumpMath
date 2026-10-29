# Vert Trace V04 — Live Ink — experimental PM handoff

**Surface:** Vert / Vert Station spin-off, NOT a replacement for frozen VERT-12.
**Input position:** the same gold active equation card used by the reel.

## Changes since V03

- Two modes remain available: Write (default) and Reel.
- Write now shows a **provisional** digit immediately after each completed finger/stylus stroke.
- The recognizer re-evaluates **all strokes in the affected digit** after every pen-up. A new stroke cancels the prior settle timer, clears the old guess, and triggers a new provisional + settled pass. A settled read follows an adjustable 320/520/850 ms pause.
- `Read now` and pre-acceptance are removed. The single **Submit answer** action does the math evaluation; pressing Submit during a pending handwriting pause forces a fresh synchronous read first.
- No stroke release, recognition update, or suggestion automatically submits a math attempt. Uncertain shapes ask for more drawing or an explicit candidate correction rather than guessing an answer.
- The supplied DigitGate v3 neural **original (38%) + kid (62%)** ensemble remains embedded and unchanged. The local adapter uses a conservative bounded expected-answer prior (default on). It is eligible only if the expected digit appears within the raw top three with at least 11% raw classifier score, a ratio of at least 0.36 to the top raw candidate, and the raw top confidence is below 86%; then adds at most 0.75 to the expected digit logit. These are engineering heuristics, **not calibrated probabilities or proof of handwriting accuracy**.
- Test settings support one, two, or three separate digit cells and up to the 1–999 problem range. Multi-digit input uses **one digit per cell**; it does not yet automatically segment a 2–3 digit number written in one large box.
- Diagnostic details remain behind collapsed test settings.

## Quick acceptance script

1. Open V04 in Safari and ensure the page says `V04` and shows `? + 5 = 8`.
2. Write a `3` inside the gold card. An early reading should appear under Undo / Clear.
3. Add a second stroke to any digit (try completing a `5` with a separate top cap). The earlier recognition must update, without scoring an attempt.
4. Use **Submit answer** once. The game checks the detected number against the equation.
5. Use **Reel** mode and verify swiping plus Submit still work.
6. Under Test settings, try 2-digit and 3-digit separated input and the balanced/fast/relaxed pause options.
7. Capture true learner handwriting samples (including false negatives, false positives, and 1/7, 3/8, 5/3) and collect confusion matrices before integrating to the suite.

## Evidence

- Automated Chromium smoke tests passed at widths 360, 390, and 820 px: app startup, both modes, multi-stroke re-recognition, no auto-submission, single Submit boundary, 3-digit layout, and absence of page errors.
- These tests are not a physical iPhone/Safari acceptance test and do not establish live handwriting recognition accuracy across children.
- This version is hosted through a public GitHub experimental branch and an external HTML viewer for testing; no VERT-12 source was changed.

## Source authority

- `digit-gate-core-only.js`: original user-supplied ensemble and model weights, embedded in HTML.
- `vert-trace-v03-iphone-test.html`: source baseline used by the V04 builder.
- `build_vert_trace_v04.py`: deterministic build from V03 source; creates V04 full HTML.
- `test_vert_v04.py`: browser regression test. Needs Python Playwright and a Chromium binary.

## V04 repository and audit

Public experimental repository: `paulanerj/MathForge-JumpMath`.
Branch: `experiment/vert-trace-v03-iphone-preview`.
Application path: `experiments/vert-trace-v04/index.html`.
First V04 code commit: `027a18ebe76e51bfcd6e18cca508b66f195c89e4`.
Build HTML SHA-256: `a7eec8e25a30beb58e6c1d5e5390c8e1db4827fed5e7c646f1fefdaaab3880af`.

The previous V03 demo and frozen VERT-12 remain unchanged.