# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Clone of the classic arcade game **Asteroids**, built with pure HTML5 canvas and vanilla JavaScript (ES6+). No build tools, no bundler, no dependencies, no package.json.

## Running the game

Open `index.html` directly in a browser, or serve it locally:

```bash
npx serve .
```

There are no build, lint, or test commands — this is a static 3-file project (`index.html`, `game.js`, `favicon.svg`). Verify changes by opening the page in a browser and playing.

## Architecture

Everything lives in `game.js` (single file, no modules/imports). Structure, top to bottom:

- **Input**: raw keydown/keyup state kept in `keys` (held) and `justPressed` (edge-triggered, consumed via `pressed(code)`).
- **Entity classes**: `Bullet`, `Asteroid`, `Ship`, `Particle` — each owns its own `update(dt)` and `draw()`. There is no shared entity base class or ECS; the game loop just calls these methods on arrays of instances.
- **Global mutable game state**: `ship`, `bullets`, `asteroids`, `particles`, `score`, `lives`, `level`, `state` (`'playing' | 'dead' | 'gameover'`) declared with `let` at module scope and reassigned by `initGame()` / `nextLevel()`. Arrays are replaced (via `.filter()`), not mutated in place, when removing dead entities each frame.
- **Game loop**: `requestAnimationFrame(loop)` computes `dt` in seconds (clamped to 0.05s max to avoid physics blow-ups on tab-switch lag), then calls `update(dt)` followed by `draw()`.
- **Toroidal space**: all moving entities wrap position via the `wrap(v, max)` util instead of colliding with screen edges.
- **Collision detection**: simple circle-circle distance checks (`dist`) against each entity's `radius` — no spatial partitioning, fine at this entity count.
- **Asteroid splitting**: `Asteroid.split()` produces two smaller asteroids (size 3→2→1) at the same position with new random velocity; size-1 asteroids don't split further. Size/speed/points are indexed by size via the `RADII`, `SPEEDS`, `POINTS` arrays (index 0 unused).
- Canvas is fixed at 800×600 (`W`, `H` constants); no responsive/resize handling.

## Notes

- The README describes power-ups and a "shooting star" asteroid type — these were removed from the code (see git history); don't assume README feature descriptions match current `game.js` behavior.
