# Plasma authority R1

This is the source of truth for the plasma wall. Do not replace these rules from memory or from an older renderer fragment.

## Physical state

There is one wave object. Its world position is `state.wave.y`. Larger Y is behind Zyrx. The shock front's world position is that value plus `SHOCK_FRONT_WORLD_OFFSET` (currently 0).

## Writers

- `ensureWave` creates the object at `player.y + spawnDistanceBehind`.
- `placeWave` is the only `wave.y =` assignment. A new life places the front at `player.y + 900`. The plasma lab may call it only when `plasmaProbe` is set.
- Active play has one tick: `wave.y -= wave.speed * effectiveDt`.
- Answers, landings, row changes, platform recycling, and the camera do not write `wave.y`.

## Movement

During active simulation:

```text
wave.y(t + dt) = wave.y(t) - baseSpeed * dt
```

Constants: spawn 900, speed 28, collision 26, warning 520.

A frozen lab does not tick. `advancePlasmaTime` uses the same tick for one step.

## Coordinates

- World: `wave.y`, `zyx.y`, `camera.y`.
- Player-relative: `gap = wave.y - zyx.y`. This is threat, not location.
- Screen: `worldToScreenY(worldY, cameraY, viewportHeight) = viewportHeight / 2 - cameraY + worldY`.

There is no second screen formula for the crest.

## Rendering

The crest, its filled body, its white edge, and its glow are drawn at `physical.screenY` only when that body intersects the viewport. The screen value is the projection of the wave. It is not a target the wave is moved toward.

## Atmosphere

Heat, glow, and warning color are a viewport tint. Coverage and intensity come from the gap. They may sit on the bottom of the screen while the crest is still below the view. They are not a second crest and they do not change `wave.y`.

## Camera

The camera may change where the front appears. It may not change where the front is. Moving the camera with time frozen leaves `wave.y` and the shock-front world position unchanged. The screen position changes only through `worldToScreenY`.

## Player

The player may change the gap and therefore threat, heat, and warning. The player may not change the shock front's world position. A jump with zero elapsed simulation time does not move the wave.

## Lifecycle

Spawn and plasma-death recovery place the front one spawn distance behind the player. That is a new life, not pursuit. Pursuit after that is time only.

## Tests

| Contract | Protects |
|---|---|
| AA | Distant threat is atmosphere. The crest appears only when the wave enters the view. Collision matches the wave. |
| AB | Wave motion is time only. |
| AH | Campaign play keeps atmosphere and a wave-tied front. |
| AL | One wave, one tick, one derivation. |
| AM | One world-to-screen helper. |
| AN | The heat and crest colors live in `PLASMA_PRESENTATION`. |
| AO | Player and camera changes do not move the front in the world. |
| AP | Moving the player at frozen time does not move the front. |
| AQ | Moving the camera at frozen time does not move the front. |
| AR | A level 6 jump moves the front only with the timed wave. |
| AS | No crest anchored to the player or to a fixed viewport line. |

`npm run test:plasma` runs this contract file with the existing toolchain.

## Protected names

`derivePlasmaPresentation`, `worldToScreenY`, `SHOCK_FRONT_WORLD_OFFSET`, `PLASMA_PRESENTATION`, and the single `wave.y -=` tick. Do not change their meaning without running the plasma contracts.
