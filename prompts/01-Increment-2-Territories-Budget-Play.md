Increment 2: Territories (half-board seeding) + budgets + Play screen scaffold.

“Implement only what is listed here, do not anticipate multiplayer, modifiers, or full Life stepping.”

Current state (already working):
- Lobby works (two player names + Start)
- Seed screen shows large canvas grid
- Painting works
- Toggle active player works
- Clear board works
- Back to lobby works

Goal of this increment:
Make seeding fair and structured by splitting the board into halves (no overwrites by design), add a small cell budget per player, and add a Play screen scaffold that preserves the seeded grid.

Do NOT implement Conway simulation yet.

REQUIREMENTS

A) Board split into territories (Seed phase)
1) Visually indicate a vertical split down the centre of the grid.
   - midX = width / 2 (assume width is even, e.g. 80)
   - Draw a subtle divider line at the boundary.
   - Optional: slightly tint each half differently, but keep it subtle and consistent with the navy theme.

2) Enforce seeding restrictions:
   - If active player is P1, they can only place/remove cells where x < midX.
   - If active player is P2, they can only place/remove cells where x >= midX.
   - Attempts outside territory should do nothing (no overwrite, no erase).

B) Seeding interaction improvements
1) Click toggles within territory:
   - If cell is empty and player has remaining budget, place it.
   - If cell is occupied by that same player, remove it.
   - If cell is occupied by the other player, do nothing (though this should be impossible due to territory rules).

2) Drag painting:
   - Drag should place cells (not toggle) within territory.
   - Respect budget.
   - Optional (nice): holding Shift while dragging erases only your own cells, within territory.

C) Budgets (smaller, more strategic)
- Set default budget to 25 cells per player.
- HUD on Seed screen must show:
  - Active player name + colour (P1 orange, P2 mint)
  - P1 placed: n/25
  - P2 placed: n/25
- Prevent placing beyond budget, but allow removing to free up budget.

D) Continue to Play (new screen)
1) Create src/ui/PlayScreen.tsx.
2) Add a “Continue” button on Seed screen:
   - Navigates to Play screen.
   - Must preserve the current seeded arrays (no reinitialising).

E) Play screen scaffold (no simulation yet)
Play screen must:
- Display the same LifeCanvas with the seeded state preserved.
- Show HUD:
  - Tick count (0 for now)
  - Live cells per player (computed from arrays)
- Controls (wired to placeholder handlers for now):
  - Play/Pause (toggle a boolean state, but do not step yet)
  - Step (placeholder: console.log or increment tick without changing grid, your choice)
  - Reset (should clear board and set tick to 0, then return to Seed screen or stay on Play screen, pick the simplest consistent behaviour)

F) State plumbing constraints
- Alive/owner arrays must persist across screens via refs.
- React must not store per-cell state.
- Keep changes minimal and consistent with the existing modular structure:
  src/app/App.tsx
  src/ui/Lobby.tsx
  src/ui/SeedScreen.tsx
  src/ui/PlayScreen.tsx (new)
  src/canvas/LifeCanvas.tsx
  src/canvas/renderer.ts
  src/canvas/input.ts
  src/game/types.ts
  src/styles/tokens.css
  src/styles/global.css

BRAND
- Use CSS variables already defined in tokens.css:
  --orange #f15f24
  --navy #162237
  --mint #86dabd
  --white #ffffff
  --grey #efefef
  --blue #65a9ee
- Keep the “liquid glass” UI style for cards/buttons/inputs.
- Do not introduce new libraries.

DELIVERABLE
Return the complete updated contents of every file you change or create.
Do not implement the Conway simulation rules in this increment.