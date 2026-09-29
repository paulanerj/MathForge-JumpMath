# JUMPMATH --- AI STUDIO MIGRATION START HERE

This folder is the clean migration kit for transferring JumpMath from
the previous Grok workspace to AI Studio.

## What this is

The production source and engineering evidence were taken from the
verified inner handoff archive
`JUMPMATH_AI_STUDIO_HANDOFF_2026-09-28.zip`.

The previous workspace was not a Git checkout. The captured state
therefore has no authoritative historical commit or branch.

The original capture intentionally omitted `node_modules` and has no
trusted lockfile. It is a source/evidence baseline, not a guaranteed
clean-install package.

## What was reorganized for migration

Production source, tests, configuration, build scripts, current build
evidence and governing documents remain available.

Historical archives, old patch/fix scripts and legacy SOT packages are
quarantined under `forensics/grok/`. They are evidence only. They are
not current production authority and must not be executed automatically.

The MathForge SDK compatibility standard is under `docs/mathforge/`. It
defines future architectural constraints. It does not authorize
inventing or implementing a MathForge SDK.

## First AI Studio instruction

Paste the complete contents of `AI_STUDIO_TAKEOVER_PROMPT.md` into the
first AI Studio coding conversation after the files are present.

AI Studio must reconcile the capture before editing production code.

## Current critical status

The plasma system is not player accepted. The physical time-only wave
rule was previously accepted, but later visual implementations
repeatedly regressed. Level Studio is experimental and has not been
player reviewed.

## Important files

-   `AI_STUDIO_TAKEOVER_PROMPT.md` --- first instruction to AI Studio.
-   `docs/AI_STUDIO_MASTER_HANDOFF.md` --- detailed prior-coder state
    capture.
-   `project-state.json` --- machine-readable captured status.
-   `docs/REGRESSION_HISTORY.md` --- major drift/regression history.
-   `docs/AI_STUDIO_ENGINEERING_RULES.md` --- engineering guardrails.
-   `docs/mathforge/MATHFORGE_SDK_COMPATIBILITY_STANDARD.md` --- future
    host/SDK compatibility standard.
-   `docs/PLASMA_AUTHORITY_R1.md` --- previous plasma authority attempt;
    evidence, not proof of acceptance.
-   `STATE_CAPTURE_MANIFEST.sha256` --- original Grok capture manifest.
-   `MIGRATION_MANIFEST.sha256` --- hashes for this reorganized
    migration kit.
-   `forensics/grok/README_MIGRATION_FORENSICS.md` --- explains
    quarantined material.

## Recommended transfer order if AI Studio requires manual file upload

1.  Root config and bootstrap files.
2.  `src/`.
3.  `tests/` and `scripts/`.
4.  `docs/`.
5.  Only provide `forensics/` if a forensic comparison is needed.

Do not begin by feeding AI Studio historical archives as active code.
