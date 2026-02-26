# Architecture – Conway Duel

## Core Principle

Separate:

1. UI State (React)
2. Simulation Engine (Pure Logic)
3. Canvas Renderer (Imperative Drawing)

React must NEVER render individual cells.

---

## Data Model

Grid representation:

- width
- height
- current: Uint8Array (alive state)
- next: Uint8Array (buffer)
- owner: Int8Array
- nextOwner: Int8Array

Indexing:

index = y * width + x

Flat arrays for performance.

---

## Engine Responsibilities

engine.ts:

- stepLife()
- countNeighbours()
- applyOwnership()
- swapBuffers()

Must:
- Perform zero React operations
- Avoid memory allocations inside loops
- Use tight for-loops

---

## Renderer Responsibilities

renderer.ts:

- drawGrid()
- drawAliveCells()
- drawOwnershipColours()

Canvas:
- Single canvas element
- requestAnimationFrame loop
- Render independent of simulation tick

---

## Input Layer

input.ts:

- Pointer events
- Convert mouse position to grid coordinates
- Update grid arrays directly
- Trigger minimal redraw

---

## React Layer

App.tsx:
- Manages current screen
- Holds global game settings

Screens:
- Lobby
- Seed
- Play

HUD:
- Reads engine state
- Displays:
  - Tick
  - Live counts
  - Controls

---

## Simulation Timing

- setInterval or requestAnimationFrame-based timer
- Tick rate independent of render rate
- Render may run at 60fps
- Simulation default 12 ticks/sec

---

## Multiplayer (Future)

Networking layer will:

- Synchronise seed state
- Synchronise tick state
- Server authoritative

Engine remains unchanged.