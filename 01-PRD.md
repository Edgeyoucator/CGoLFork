# Conway Duel – Product Requirements (MVP)

## Vision

A 2-player, web-based competitive version of Conway’s Game of Life.

Designed for use within the CATALYST course:
- Strategic thinking
- Emergent systems
- Competitive dynamics
- Later expansion into modifiers and multiplayer rooms

The MVP runs locally (single device). Online rooms will be added later.

---

## Core User Flow (MVP)

1. Lobby Screen
   - Player 1 enters name
   - Player 2 enters name
   - Start button

2. Seeding Phase
   - Shared board visible
   - Active player toggle
   - Player 1 places orange cells
   - Player 2 places mint cells
   - Optional cell budget (default: 60 each)
   - Clear Board button
   - Continue to Play button

3. Play Phase
   - Simulation runs
   - HUD shows:
     - Tick count
     - Live cells per player
   - Controls:
     - Play / Pause
     - Step
     - Reset

4. End Condition
   - Default: After 200 ticks
   - Winner = player with most live cells
   - Tie allowed

---

## Design Constraints

- React for UI only
- Canvas for board rendering
- No DOM grid cells
- Simulation logic isolated from UI
- Double buffer grid system

---

## Technical Constraints

Grid size (default):
- 80 x 50

Simulation:
- 12 ticks per second default
- Adjustable later

Ownership:
- Each cell stores:
  - Alive (0 or 1)
  - Owner (-1 none, 0 P1, 1 P2)

---

## Non-Goals (MVP)

- No networking
- No accounts
- No room selection
- No persistence
- No rule modifiers
- No animations beyond basic rendering

---

## Future Extensions (Not Yet)

- Online rooms (20 concurrent)
- Ready system
- Timed seeding phase
- Alternate rulesets
- Fog of war
- Randomised maps
- Score multipliers
- Replay system