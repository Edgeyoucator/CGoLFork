We are building “Conway Duel”, a 2-player competitive Game of Life for CATALYST.
This first increment must be a thin vertical slice that I can test immediately:
React manages screens and UI, canvas handles board rendering and painting. No Life simulation yet.

TECH:
- Vite + React (TypeScript preferred but not required if it slows you down).
- React must NOT render per-cell DOM elements. Only a single <canvas> for the board.
- Keep code modular, using these files and folders exactly:

src/app/App.tsx
src/ui/Lobby.tsx
src/ui/SeedScreen.tsx
src/canvas/LifeCanvas.tsx
src/canvas/renderer.ts
src/canvas/input.ts
src/game/types.ts
src/styles/tokens.css
src/styles/global.css

BRAND TOKENS (put in tokens.css as CSS variables):
--orange: #f15f24;
--navy: #162237;
--mint: #86dabd;
--white: #ffffff;
--grey: #efefef;
--blue: #65a9ee;

STYLE:
- global background navy, text white, serif font stack.
- UI should look clean and “CATALYST” (cards/buttons, not default ugly HTML).
- Use a “liquid glass” look: semi-transparent cards (rgba(255,255,255,0.08)), backdrop-filter: blur(12px), thin border (rgba(255,255,255,0.12)), soft shadow, rounded corners (18px).
- Buttons and inputs should match the same glass style with hover/active states.


INCREMENT 1 REQUIREMENTS:
1) Lobby screen:
   - Two text inputs: “Player 1 name”, “Player 2 name”
   - “Start” button goes to Seed screen
   - Store names in React state.

2) Seed screen:
   - Show a canvas board with a visible grid.
   - Default grid size: 80x50.
   - Cell size should be responsive: fit canvas to available space while maintaining aspect ratio.
   - Painting:
     - Click or click-drag paints cells alive for the active player.
     - Active player toggle button switches between P1 and P2.
     - P1 paints orange, P2 paints mint.
   - Buttons: Toggle Active Player, Clear Board, Back to Lobby.
   - Show small HUD text: active player name + colour, and counts of alive cells per player.

IMPLEMENTATION DETAILS:
- Keep board state in typed arrays:
  - alive: Uint8Array (0/1)
  - owner: Int8Array (-1, 0 for P1, 1 for P2)
- Canvas rendering should be imperative (no React re-render per paint).
- Use pointer events in input.ts, support mouse + touch.
- renderer.ts should expose draw(alive, owner, width, height, cellSize, ctx).
- LifeCanvas.tsx owns the canvas ref and connects input + renderer.

DELIVERABLE:
Return the complete contents for all files you create or modify, so I can copy-paste directly.
Do not implement simulation yet.

