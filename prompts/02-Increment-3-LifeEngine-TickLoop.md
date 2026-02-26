Increment 3: Implement Conway simulation + ownership births + tick loop + end condition.
We already have: Lobby, Seed screen with half-board territories + budgets, and a Play screen scaffold with controls.

Goal: Make the Play screen actually run the game.

Do NOT implement networking, rooms, accounts, or rule modifiers beyond what is specified here.

FILES / STRUCTURE
Keep modular structure. Add new files only if specified.
Existing:
- src/app/App.tsx
- src/ui/Lobby.tsx
- src/ui/SeedScreen.tsx
- src/ui/PlayScreen.tsx
- src/canvas/LifeCanvas.tsx
- src/canvas/renderer.ts
- src/canvas/input.ts
- src/game/types.ts
Add:
- src/game/engine.ts (new)
- src/game/scoring.ts (new, lightweight)

ENGINE REQUIREMENTS (src/game/engine.ts)
Data model:
- width, height
- alive: Uint8Array (0/1)
- owner: Int8Array (-1, 0=P1, 1=P2)
Use double buffers:
- nextAlive: Uint8Array
- nextOwner: Int8Array

Implement:
1) stepLife(params):
   Inputs: alive, owner, nextAlive, nextOwner, width, height
   Output: writes into nextAlive and nextOwner (does not allocate)
   Rules:
   - Neighbourhood: 8 neighbours, no wrap. Out-of-bounds = dead.
   - Survival: if alive==1 and neighbours is 2 or 3 => survives, owner preserved.
   - Death otherwise: nextAlive=0, nextOwner=-1.
   - Birth: if alive==0 and neighbours==3 => candidate birth
       - Determine newborn owner from the 3 living neighbours’ owners:
         count P1 vs P2.
         If majority exists => newborn owner is that player, nextAlive=1.
         If tie (e.g. 1 vs 1 vs neutral should not happen, but handle anyway) => NO BIRTH (nextAlive=0, nextOwner=-1).
   Notes:
   - Because we enforce territories only during seeding, simulation can freely spread across the whole grid.

2) swapBuffers helper or do it in caller:
   After stepLife, swap alive<->nextAlive and owner<->nextOwner references without copying arrays.

3) countLiveByPlayer(alive, owner):
   Returns {p1: number, p2: number, total: number}

SCORING REQUIREMENTS (src/game/scoring.ts)
- function getWinner(p1Count: number, p2Count: number): "P1" | "P2" | "Draw"

PLAY SCREEN BEHAVIOUR (src/ui/PlayScreen.tsx)
1) Controls must work:
- Play/Pause: toggles running state.
- Step: advances exactly one tick (calls engine once) even if paused.
- Reset: clears board (alive=0, owner=-1), tick=0, stops running, and returns to Seed screen OR stays on Play (pick simplest and keep consistent with current UX).

2) Tick loop:
- Default tickRate = 12 ticks/sec.
- Implement using setInterval or requestAnimationFrame with accumulator (either is fine), but must be stable and not drift wildly.
- Simulation tick must be decoupled from render. Rendering can remain rAF.

3) End condition:
- End at maxTicks = 200.
- When tick reaches 200:
  - Stop running.
  - Show a result panel (liquid glass) with:
    - Winner (based on live cell counts at end)
    - Final counts
    - Buttons: “Back to Seed” and “Play Again” (Play Again can reset tick to 0 but keep the same seed, simplest acceptable).

4) HUD updates:
- Always show: tick count, P1 live, P2 live.
- Update efficiently: do not push whole grid into React state.
- Use refs for arrays. Use small React state for tick/running/counts only.

CANVAS
- LifeCanvas should re-render the view from arrays (alive/owner).
- Ensure performance: no per-cell React rendering.
- Draw updates should reflect each tick quickly.

TESTING EXPECTATIONS
- Seed a few cells and press Play, patterns evolve correctly.
- Ownership on birth is visible (new cells take majority colour).
- Step works when paused.
- Max tick stop + result panel appears reliably at 200.

DELIVERABLE
Return complete file contents for any file changed or created:
- src/game/engine.ts (new)
- src/game/scoring.ts (new)
- any updates to PlayScreen/App/LifeCanvas/renderer as needed
Do not add extra features beyond what is described.