# Cat Escape - Agent Notes

## Project Snapshot

This folder contains a small browser game called **Cat Escape**. It is built as a single static HTML page with canvas rendering and a local cat sprite image.

The current game is playable directly in a browser by opening `index.html`. It does not have a package manager, build step, test runner, or local server requirement at the moment.

## Files

- `index.html` - Complete game implementation: HTML shell, Tailwind CDN styling, canvas drawing, input handling, game loop, map, AI movement, collision, win/loss screens.
- `cat.png` - Cat player sprite, currently `100 x 105` PNG.
- `avatar-face.png` - Photo face avatar enemy sprite with a transparent background.
- `avatar-dog.png` - Dog face/head avatar enemy sprite with transparent corners.
- `avatar-glasses.png` - Glasses face/head avatar enemy sprite with transparent corners.
- `avatar-smile.png` - Smiling face/head avatar enemy sprite with transparent corners.
- `avatar-face-source.png` - Source generated/chroma-key image used to create `avatar-face.png`.
- `AGENTS.md` - This file, used to brief future coding agents on the project.

## Current Game Design

The player controls the cat inside a 16x16 tile maze. Four photo avatar enemies chase the cat through the maze. The goal is to survive for 20 seconds, then reach the randomly spawned escape portal.

Current rules:

- The map is a fixed 16x16 grid.
- `1` means wall and `0` means floor.
- The cat starts at tile `(1, 1)`.
- Four avatars start around the maze and chase the cat. Each avatar uses a local photo face/head sprite with a colored circular outline.
- Avatars use breadth-first search pathfinding toward the cat's target tile.
- After 20 seconds, an emerald portal spawns on a random empty tile.
- Touching the portal after it appears wins the game.
- Touching an avatar loses the game.

## Controls

- Keyboard movement: arrow keys or WASD.
- Mobile movement: on-screen D-pad.
- Speed up: `+` key or the `+` button.
- Speed down: `-` key or the `-` button.
- Restart after game over: Space.

Developer/debug controls currently present in the game:

- Press `0` to toggle avatars from chasing to fleeing.
- Left-click the canvas while playing to toggle cat wall pass-through mode.

## Implementation Notes

- Rendering is done with the 2D canvas API.
- The canvas uses pixelated rendering for a retro tile look.
- Tailwind is loaded from `https://cdn.tailwindcss.com`, so styling depends on internet access unless this is changed later.
- Game state is kept inside `window.onload` in `index.html`.
- The game loop uses `requestAnimationFrame`.
- Movement is grid-based but animated between tiles with per-entity `progress`.
- Collision checks use interpolated tile positions so moving entities can collide during transitions.
- The canvas is resized responsively based on viewport size.
- Photo avatars are loaded through the `avatarImages` map and referenced from avatar objects with an `image` key, for example `image: 'avatar-face'`.
- Photo avatars are drawn as clipped circular sprites with the avatar's `color` used as an outline. If the image is missing or not loaded, the old colored canvas avatar drawing remains the fallback.
- The current photo avatar was made from a face-only cutout. Prefer transparent PNG avatars; if transparency is not practical, use a clean white or flat solid background.

## Development Guidelines

- Keep the game playable as a simple static project unless there is a clear reason to add a framework or build system.
- Preserve the parent-and-child friendly style: changes should be easy to understand and experiment with.
- Prefer small, visible improvements over large rewrites.
- If adding new mechanics, keep constants near the existing game constants and document any new controls in this file.
- When adding more photo avatars, save each as a local project PNG, add it to `avatarImages`, and assign it to one avatar object with an `image` key.
- For user-provided photos, crop to the face/head, remove the background when possible, and keep the result readable at small tile size.
- After every visible game modification, show the game in the browser. Use the regular `index.html` path so the actual playable flow is tested.
- After completing each task, commit the finished changes to Git with a concise message that describes the work.
- If the game grows beyond one file, split by responsibility: rendering, map data, entities, input, and game state.
- Avoid removing the current debug controls unless replacing them with clearer development tools.

## Ideas Already Implied By The Current Code

- Add levels by swapping different 16x16 maps.
- Add collectibles before the escape portal opens.
- Add visible indicators for debug modes such as wall pass-through and avatar fleeing.
- Add difficulty settings that change avatar count, avatar speed, portal timing, or map layout.
- Replace CDN Tailwind with local CSS if offline play becomes important.
