# Game Rules – Conway Duel

## Base Rules: Conway’s Game of Life

For each cell:

1. Survival:
   - A live cell with 2 or 3 neighbours survives.
   - Otherwise it dies.

2. Birth:
   - A dead cell with exactly 3 neighbours becomes alive.

Classic Life logic.

---

## Ownership Rules (Duel Mode)

Each live cell has an owner:
- 0 = Player 1
- 1 = Player 2
- -1 = empty

### Survival

- Surviving cells retain their owner.

### Birth

When a new cell is born:

1. Count the 3 living neighbours.
2. Count ownership of those neighbours.
3. Majority owner becomes new owner.

If ownership is tied:
- No birth occurs.

---

## Win Condition (MVP)

Simulation ends at tick 200.

Winner:
- Player with more live cells.

If equal:
- Draw.

---

## Edge Rules

- Grid does NOT wrap (no toroidal world).
- Cells outside bounds are treated as dead.
- No neutral cells.
- No partial ownership.

---

## Later Rule Variants (Not Active)

- Toroidal wrapping
- Birth on tie creates neutral cell
- Territory scoring (largest cluster)
- Sudden death when one player eliminated
- Resource-based spawning