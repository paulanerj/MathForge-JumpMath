# JumpMath handoff — start here

This package is a frozen copy of the JumpMath workspace on 2026-09-28.

It is a state capture. It is not a release, and it is not a claim that the game is accepted.

## Git

THIS WORKSPACE IS NOT CURRENTLY A GIT CHECKOUT.
NO AUTHORITATIVE COMMIT HASH EXISTS FOR THIS STATE.

Prove you have this capture with `STATE_CAPTURE_MANIFEST.sha256` and the ZIP hash in the master handoff.

## What to read

1. `docs/AI_STUDIO_MASTER_HANDOFF.md`
2. `project-state.json`
3. `docs/REGRESSION_HISTORY.md`
4. `docs/AI_STUDIO_ENGINEERING_RULES.md`
5. `AI_STUDIO_BOOTSTRAP_PROMPT.md` if you are starting a new AI Studio session

## Critical blocker

Plasma presentation is not player-accepted.

Paul accepted that the wall must move only with simulation time, and that correct and wrong landings must not teleport it. He has not accepted the current picture of the wall.

The last build he was given is `artifacts/current-build/`. He did not return a verdict on it before this capture.

## Level Studio

`?levelStudio=1` exists. Paul has not reviewed it. It is experimental.

## How to run, test, and build

This ZIP does not contain `node_modules`. It will not run by itself.

Use the existing install in the captured environment, or the separate snapshot archive if you have it. Do not run `npm install` and expect the same tree. There is no lockfile.

From the project root, with the current `node_modules`:

```text
npm test
npm run test:plasma
npm run build
```

Build only through `scripts/run-vite.mjs`. Do not use `npx vite`. The parent environment has a different Vite.

There is no dev server in this package. `npm run dev` is the supported command when an environment exists.
