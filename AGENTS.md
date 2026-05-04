# Cat Escape - Agent Notes

## Project Snapshot

This folder contains a small browser game called **Cat Escape**. It is built as a static HTML/CSS/JavaScript page with canvas rendering and local sprite images.

The current game is playable directly in a browser by opening `index.html`. It does not have a package manager, build step, test runner, or local server requirement at the moment.

## Files

- `index.html` - HTML shell for the game UI, canvas, modals, and controls.
- `styles.css` - Local CSS for body, canvas, and mobile controls.
- `game.js` - Game implementation: canvas drawing, input handling, game loop, map, AI movement, collision, win/loss screens.
- `levels.js` - Static data for the 20 pre-generated 16x16 level maps.
- `cat.png` - Cat player sprite, currently `100 x 105` PNG.
- `avatar-face.png` - Close-up dog enemy sprite with transparent corners.
- `avatar-dog.png` - Smiling dog enemy sprite with transparent corners.
- `avatar-glasses.png` - Dog portrait enemy sprite with transparent corners.
- `avatar-smile.png` - Mirrored close-up dog enemy sprite with transparent corners.
- `avatar-collie.png` - Black-and-white collie enemy sprite.
- `avatar-face-source.png` - Source dog crop used to create `avatar-face.png`.
- `avatar-collie-source.png` - Source screenshot used to create `avatar-collie.png`.
- `AGENTS.md` - This file, used to brief future coding agents on the project.

## Current Game Design

The player controls the cat inside a 16x16 tile maze. Five dog avatar enemies wander through the maze. The goal is to survive for 20 seconds, then reach the randomly spawned escape portal. The game has 20 pre-generated levels, and each win advances to the next level.

Current rules:

- Each level map is a pre-generated 16x16 grid stored in `levels.js`.
- `1` means wall and `0` means floor.
- The level maps keep every floor tile connected, avoid dead-end floor tiles, and avoid 2x2 solid wall blocks so walls never appear double-thick.
- The cat starts at tile `(1, 1)`.
- Five avatars start around the maze and wander independently. Each avatar uses a local dog face/head sprite with a colored circular outline.
- Avatars chase the cat while they have direct line of sight in the same row or column with no wall between them. Without line of sight, avatars take an open right turn only when it leads into a tunnel-like tile with at most two exits. Otherwise they keep moving in their current direction until they hit a wall, then pick a random open direction that does not immediately backtrack unless they are at a dead end.
- After 20 seconds, an emerald portal spawns on a random empty tile.
- Touching the portal after it appears wins the game.
- Winning a level advances to the next map. Winning level 20 resets the next run back to level 1.
- Touching an avatar loses the game.
- Starting begins at level 1. Retrying after being caught restarts the current level.

## Controls

- Keyboard movement: arrow keys or WASD.
- Mobile movement: on-screen D-pad.
- Speed up: `+` key or the `+` button.
- Speed down: `-` key or the `-` button.
- Restart after game over: Space.
- Optional start code: enter `1121` before pressing Play to let Space toggle wall pass-through while playing.
- Optional start code: enter `6767` before pressing Play to let Space make the cat move 6 times faster while held.
- Code help: enter `?` in the code box to show all available codes.

Developer/debug controls currently present in the game:

- Left-click the canvas while playing to toggle cat wall pass-through mode.

## Implementation Notes

- Rendering is done with the 2D canvas API.
- The canvas uses pixelated rendering for a retro tile look.
- Tailwind is loaded from `https://cdn.tailwindcss.com`, so styling depends on internet access unless this is changed later.
- Game state is kept inside `window.onload` in `game.js`.
- Level data is loaded from `window.CAT_ESCAPE_LEVELS` in `levels.js`.
- The game loop uses `requestAnimationFrame`.
- Movement is grid-based but animated between tiles with per-entity `progress`.
- Collision checks use interpolated tile positions so moving entities can collide during transitions.
- The canvas is resized responsively based on viewport size.
- Dog avatars are loaded through the `avatarImages` map and referenced from avatar objects with an `image` key, for example `image: 'avatar-face'`.
- Dog avatars are drawn as clipped circular sprites with the avatar's `color` used as an outline. If the image is missing or not loaded, the old colored canvas avatar drawing remains the fallback.
- Prefer transparent PNG avatars; if transparency is not practical, use a clean white or flat solid background.

## Development Guidelines

- Keep the game playable as a simple static project unless there is a clear reason to add a framework or build system.
- Preserve the parent-and-child friendly style: changes should be easy to understand and experiment with.
- Prefer small, visible improvements over large rewrites.
- If adding new mechanics, keep constants near the existing game constants and document any new controls in this file.
- When adding more photo avatars, save each as a local project PNG, add it to `avatarImages`, and assign it to one avatar object with an `image` key.
- For user-provided photos, crop to the face/head, remove the background when possible, and keep the result readable at small tile size.
- After every visible game modification, show the game with the embedded Browser skill. Use the regular `index.html` file URL so the actual playable flow is tested.
- After completing each task, commit the finished changes to Git with a concise message that describes the work.
- Publishing is done by pushing committed changes with `git push`; do not create local publish zip archives or reintroduce a publishing skill/folder.
- If the game grows beyond one file, split by responsibility: rendering, map data, entities, input, and game state.
- Avoid removing the current debug controls unless replacing them with clearer development tools.

## Ideas Already Implied By The Current Code

- Add levels by swapping different 16x16 maps.
- Add collectibles before the escape portal opens.
- Add visible indicators for debug modes such as wall pass-through.
- Add difficulty settings that change avatar count, avatar speed, portal timing, or map layout.
- Replace CDN Tailwind with local CSS if offline play becomes important.
