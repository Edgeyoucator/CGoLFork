# Claude Task Breakdown – Conway Duel

These tasks should be executed in sequence inside Cursor.

---

## TASK 1 – Project Scaffold

Create:

- Vite + React project
- Folder structure exactly as defined
- tokens.css with brand colours
- global.css with navy background, serif font, clean layout

Implement:
- Lobby screen
- Seed screen
- Play screen
- Canvas wrapper component
- HUD placeholder

No simulation yet.

---

## TASK 2 – Painting System

Implement:

- Pointer input
- Grid coordinate mapping
- Painting alive cells
- Owner assignment
- Active player toggle
- Clear board

Ensure:
- React does not re-render per cell
- Canvas updates directly

---

## TASK 3 – Life Engine

Implement:

- Double-buffer simulation
- Survival rules
- Birth rules
- Ownership majority rule
- No birth on tie

Test:
- Known Life patterns
- Ownership spread behaviour

---

## TASK 4 – Simulation Loop

Implement:

- Adjustable tick rate
- Play / Pause
- Step
- Reset

Ensure:
- Simulation decoupled from rendering
- Stable at 12 ticks/sec

---

## TASK 5 – HUD Wiring

Display:
- Tick count
- Live count P1
- Live count P2

Ensure minimal React updates.

---

## TASK 6 – End Condition

After 200 ticks:
- Stop simulation
- Declare winner
- Show result panel

---

## TASK 7 – Refactor Pass

- Remove redundant renders
- Confirm no array allocations inside main loop
- Confirm no React state holds full grid

---

## DO NOT

- Introduce networking yet
- Introduce rule modifiers
- Use DOM cells
- Use heavy state libraries
- Over-abstract prematurely