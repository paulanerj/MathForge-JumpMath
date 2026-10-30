# Vert Trace V07 — Full session diagnostic export

**Status:** isolated diagnostic experiment. The V06 28×28 finished-shape recognizer, original DigitGate model, generated problems, scoring, and one-step Submit mechanics are retained without changing the recognition model parameters or grading logic.

## User workflow on iPhone
1. Open the HTTPS playable application in Safari and draw several digits, including any that are misread.
2. Under the game (before the Developer panel), tap **Copy full log** and paste the result into ChatGPT.
3. Alternatively tap **Share / Save** and choose Save to Files or share the JSON file. If Safari does not offer file sharing, the app attempts a download.
4. If clipboard permission is blocked, tap **View log**, then **Select all log text** and copy it manually.
5. Optional: tap View log, enter the number actually drawn, then **Label current drawing**. This records the intended handwriting value without changing the game answer. Export afterward.

## Log content
- Timestamped full current-session events, not just the latest error
- All questions, modes, input settings, engine selections
- Completed strokes as normalized [x, y] points, original stroke order, and digit-slot index
- Recognition results (all ranked candidates up to 10, probabilities, raw guess, selected guess, model engine, inference milliseconds, prior boost flag)
- Manual candidate overrides, undo/clear actions, submission, selected/expected math value, correct/incorrect
- Runtime exceptions, startup failures, and unhandled promise rejections
- Current game snapshot, viewport, pixel ratio, user-agent
- Optional learner-labelled actual intended digit

No automatic network transmission and no collection of identity fields. The exported log **contains drawings and device information**; share it privately.

## Regression/verification evidence
- Node.js syntax validation of both embedded scripts: PASS
- JavaScript mock functional test for JSON serialization, Copy full log, View log, manual selection, and user label recording: PASS
- Byte-identical DigitGate first script relative to the local V06 source: PASS
- Byte-identical 28×28 shape model definition relative to local V06 source: PASS
- Complete new GitHub HTML source uploaded and verified: PASS
- End-to-end Chromium/device UI touch check: NOT VERIFIED (sandbox browser navigation blocked)
- External GitHub HTML hosting availability and physical iPhone Safari clipboard/share: requires device check

## Governance
V07 is a comparison successor at `experiments/vert-trace-v07/index.html`; it does not replace or modify V06. For long sessions, logs accumulate locally in RAM until reload; export before refreshing. High event counts may increase memory consumption. Logging should not affect math evaluation, but a mobile performance check remains required.
