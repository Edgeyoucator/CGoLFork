Increment 4: Ready/Unready with AUTO-START, seed snapshot for quick iteration, watch replay rerun, and modular win conditions.
Do NOT add networking/rooms yet. No timer.

Current state:
- Lobby -> Seed -> Play works
- Simulation runs, maxTicks=200, winner decided at end (most cells at tick 200)
- Territories enforced during seeding (split board)

GOALS
1) Untimed strategic seeding with Ready/Unready per player.
2) AUTO-START the match as soon as both players are Ready (no Start button).
3) When a match starts, capture an “original seed” snapshot.
4) “Play Again” restores the original seed so players can iterate quickly.
5) Add “Watch Replay” which reruns from the original seed quickly.
6) Keep win condition “most live cells at tick 200”, but refactor so win conditions are modular later (game modes).

DO NOT implement networking, accounts, rooms, timers, or additional rule modifiers.

A) READY / UNREADY (Seed screen)
- Add two independent toggles:
  - P1 Ready / Unready
  - P2 Ready / Unready
- The toggles must be easy to switch back (unready).
- Show readiness status clearly in the HUD (e.g. “P1: Ready”, “P2: Not Ready”).
- NO Start Match button.
- AUTO-START rule:
  - The moment BOTH players are Ready, the app must automatically transition to the Play screen and begin running the simulation immediately (running=true).
  - This must only trigger once per “ready cycle” to avoid repeated retriggers.

- IMPORTANT: Any edit to the seed board (placing/removing a cell, clear all) must automatically set BOTH players to Unready.
  - This prevents “ready while changing” confusion and matches how networking will work later.

B) SEED SNAPSHOT (“original seed”)
- On the AUTO-START event (the moment both players become Ready), capture a snapshot of the seeded state:
  - originalSeedAlive: Uint8Array copy
  - originalSeedOwner: Int8Array copy
- This snapshot must remain unchanged even if the board evolves in play.
- Store these snapshots in refs at App level so they persist across screens.

C) PLAY AGAIN / CLEAR ALL (Seed and Play)
Define behaviours precisely:

1) “Play Again” (Play screen result panel, and/or Play screen controls)
- Restores the board to the captured original seed snapshot (alive/owner).
- Resets tick to 0.
- Stops running (running=false).
- Navigates back to Seed screen so players can tweak their formation.
- Sets BOTH players to Unready (they must Ready again to auto-start).

2) “Clear All” (Seed screen)
- Clears the current seed board completely (alive=0, owner=-1).
- Clears the stored original seed snapshot (or marks as none).
- Sets both players to Unready.

D) WATCH REPLAY (Play screen result panel)
- Add a “Watch Replay” button that:
  - Restores the board to the captured original seed snapshot
  - Resets tick to 0
  - Sets running=true immediately
  - Stays on Play screen
  - Runs until maxTicks and shows the result panel again
- Keep it simple: this is a deterministic rerun, not a scrubber timeline.
- If no original seed snapshot exists yet, disable the button.

E) MODULAR GAME MODES / WIN CONDITIONS
Refactor end condition logic so it supports different win conditions later.

Implement:
- src/game/modes.ts (new)
Define a minimal interface, e.g.:
- id: string
- name: string
- maxTicks: number
- getWinner(params): "P1" | "P2" | "Draw"
Where params can include { p1Live, p2Live, tick }.

Implement default mode:
- “Classic Duel”
- maxTicks = 200
- winner = most live cells at tick maxTicks (draw if equal)

Play screen must use the selected mode (for now always Classic Duel), and the result panel should read from the mode to determine winner and end tick.

F) UI / PERFORMANCE CONSTRAINTS
- React must not store per-cell state.
- Arrays remain in refs, only small HUD state (tick/running/ready flags) in React state.
- Avoid allocations inside the step loop.
- Keep changes minimal and consistent with current architecture.

DELIVERABLE
Return complete file contents for all changed/created files:
- src/ui/SeedScreen.tsx
- src/ui/PlayScreen.tsx
- src/app/App.tsx (or wherever top-level state lives)
- src/game/modes.ts (new)
- Any small updates to types or helpers
Do not implement networking or additional features.