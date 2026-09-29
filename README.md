<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# JumpMath: Path of the Numerix

**Educational interstellar arcade.** Solve arithmetic under time pressure, jump between platforms, build combos, and outrun the Plasma Wave.

## What's New (10× Upgrade)

- **Full Campaign** — 4 sectors, 17 levels of escalating difficulty
- **4 Math Modes** — Sum To · Skip Count · Multiply · Difference
- **Progression System** — Unlock sectors, persistent high scores & stats via localStorage
- **Polished UI** — Title screen, campaign select, custom mission builder, level-clear stats
- **Touch-friendly** — Proper mobile input handling
- **Better feedback** — Score / combo / correct counts on every level clear

## Run Locally

**Prerequisites:** Node.js 18+

```bash
npm install
npm run dev
```

Open http://localhost:3000

## How to Play

1. Choose **Campaign** and start from *The Foundation*
2. Tap the correct platform number before the timer or Plasma Wave catches you
3. Build combos for flow state and higher scores
4. Clear sectors to unlock deeper space

## Math Modes

| Mode | Description |
|------|-------------|
| **SUM_TO** | Given A + ? = Target, find the complement |
| **SKIP_COUNT** | Continue the arithmetic sequence (±step) |
| **MULTIPLY** | Compute products from times tables |
| **DIFFERENCE** | Solve A − ? = B for the missing subtrahend |

## Architecture

- **React** shell for menus, progression, and overlays
- **HTML5 Canvas** engine (`GameEngine`, `Renderer`, `MorticianAPI`, …) for high-performance gameplay
- **Decoupled math layer** (`src/math/`) — presentation-ignorant challenge generation with intentional distractors

## Scripts

```bash
npm run dev      # Vite dev server
npm run build    # Production build
npm run lint     # Type-check
npm test         # Math + config regression suites
```
