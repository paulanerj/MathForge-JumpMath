# Vert Trace V06 — Finished-Shape Recognition Pilot

**Status:** experimental comparison build; not qualified for production. Frozen Vert/Vert Station and prior V03–V05 builds are unchanged.

## Why V06 exists
The supplied DigitGate engine reduces each complete handwritten digit to an 8×8 intensity grid and uses a thick internal rasterization brush. The five submitted screenshots all show a handwritten 3, but the running app displayed predictions including 1, 4 and 7.

## Main changes
- A new 28×28 finished-shape classifier, trained on a public optical-handwriting digit sample set with additional augmented digit-3 examples derived from the supplied screenshots.
- Default recognition occurs after a short pause following the **last** stroke. New strokes restart the pause.
- In **Developer panel → Recognition engine**, switch between **V06 finished shape** and **V04 DigitGate legacy** without clearing the drawing. Keep the old engine visible for comparison.
- A live per-stroke preview remains selectable, but is not the default.
- **Submit** is still the only action that grades a mathematical answer. Recognition remains advisory.

## Pilot test results (not a child-use accuracy estimate)
- Held-out optical digit sample set: **346/360 (96.1%)**.
- Five user screenshots of digit 3 under leave-one-out retraining: **4/5** correct.
- All five 3s are recognized by the final model after being included in its training; **this does not count as independent validation**.
- A synthetic continuous-stroke 3 correctly recognized in a script test.
- Full HTML JavaScript syntax parsed. Live physical iPhone browser QA **not completed** for V06.

Do not infer 96% real-world accuracy from these tests. The screenshot examples cover only one digit, the data are small, and model confidence is not fully calibrated.

## Next acceptance gate
Collect many learner-labelled samples of every digit 0–9, including incorrect and ambiguous handwriting. Evaluate per-digit confusion, rejection rate, latency, false-positive rates, different writing styles, and potential damage from expected-answer weighting. Do not merge into frozen Vert or other MathForge surfaces until this is established.

For a later native iOS/Android build, compare a production-grade digital ink model such as Google ML Kit Digital Ink Recognition. The native API is not directly available to this standalone HTML.

**Privacy:** The original screenshots are not part of the deployed HTML. This page does not automatically upload strokes.

Source: `experiments/vert-trace-v06/index.html`.
