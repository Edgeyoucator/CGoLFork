# Mobile Port Plan — Conway's Clash

## Overview

Port the game to work in **portrait orientation on mobile touch devices** without breaking
the desktop experience. The canvas engine and touch input are already functional — this
work is entirely UI/layout. The game is single-player vs AI.

## Detection Strategy

- **CSS**: `@media (pointer: coarse)` for all layout-only overrides
- **JS/React**: `window.matchMedia('(pointer: coarse)').matches` read once at app start,
  passed down as a prop or context where conditional rendering is needed
- No user-agent sniffing

---

## Target Layout Per Screen

### Lobby
- Card width: `min(380px, 90vw)` — fits small phones without overflow
- Decorative side images (logo, "developed at") hidden on mobile via `@media (pointer: coarse)`
- Name input: add `inputMode="text"`, `autoComplete="off"`, blur on submit

### SeedScreen (mobile)

Player only ever interacts with the **left half** (cols 0–39). AI cells on the right are
not shown.

```
┌─────────────────────────────┐
│  You: 12 / 25               │  ← compact HUD (player only)
├─────────────────────────────┤
│                             │
│   CANVAS (left half only,   │
│   zoomed 2× cell size)      │
│                             │
├─────────────────────────────┤
│  [Clear]  [▶ Play]  [Rules] │  ← controls row
└─────────────────────────────┘
```

- "What are the rules?" button removed from its absolute left-60px position and placed
  inline in the controls row
- AI cell count not shown during seed phase on mobile (nothing to reveal)

### PlayScreen (mobile portrait)

Full grid shown. Portrait layout stacks vertically:

```
┌─────────────────────────────┐
│  ● You: 12    AI: 18 ●      │  ← HUD row (scores + colour dots)
├─────────────────────────────┤
│        [ ▶ Play / ⏸ Pause ] │  ← prominent play button
├─────────────────────────────┤
│                             │
│   CANVAS (full 80×50 grid)  │
│                             │
├─────────────────────────────┤
│   [Step]      [Restart]     │  ← secondary controls
└─────────────────────────────┘
```

---

## Technical Approach

### LifeCanvas — half-grid viewport (`viewCols` prop)

Add an optional `viewCols?: [startCol: number, endCol: number]` prop.

When provided:
- `cellSize = Math.floor(containerWidth / (endCol - startCol))` — cells are larger
- Canvas width = `cellSize * (endCol - startCol)`
- Render loop only draws cells where `col >= startCol && col < endCol`,
  plotted at `x = (col - startCol) * cellSize`
- Input coordinate mapping: `col = Math.floor(relativeX / cellSize) + startCol`

This is self-contained to `LifeCanvas.tsx` and `input.ts`. No game logic changes.

On desktop, `viewCols` is never passed — behaviour is identical to today.

---

## Implementation Prompts (feed in order)

---

### Prompt 1 — Global CSS + preload fixes

**Files**: `index.html`, `src/styles/global.css`

Tasks:
1. In `index.html`, add a preload for the how-to-play GIF (currently causes a noticeable
   delay on first entry to the seed screen — it is not preloaded anywhere):
   ```html
   <link rel="preload" as="image" href="/video/how-to-play.gif" />
   ```
   The three `.webp` slide preloads already exist — do not duplicate them.
   Also add `viewport-fit=cover` to the existing viewport meta tag.

2. In `global.css`, wrap all `:hover` rules in `@media (hover: hover)` so they don't
   fire as sticky-hover on touch devices.

3. Add `min-height: 44px` to the `.btn` rule (minimum tap target size).

---

### Prompt 2 — Lobby responsive layout

**File**: `src/ui/Lobby.tsx`

Tasks:
1. Change the name-entry card from `width: 380` to `width: "min(380px, 90vw)"`.
2. Hide the two decorative images ("developed at", logo) on mobile using
   `@media (pointer: coarse)` — either via a className with a CSS rule, or by reading
   `isMobile` from `window.matchMedia('(pointer: coarse)').matches` and conditionally
   rendering them.
3. On the name input, add `inputMode="text"` and `autoComplete="off"`. Call
   `e.currentTarget.blur()` after the Continue button fires so the mobile keyboard
   dismisses.

---

### Prompt 3 — LifeCanvas half-grid viewport

**Files**: `src/canvas/LifeCanvas.tsx`, `src/canvas/input.ts`

Tasks:
1. Add an optional prop `viewCols?: [number, number]` to `LifeCanvas`.
2. In the `resize()` function, use `viewCols[1] - viewCols[0]` (or `GRID_W` if absent)
   as the column count for cell size and canvas width calculation.
3. In the render loop, skip cells outside `viewCols` range and offset the draw x-position
   by `startCol`.
4. In `input.ts` / `cellFromPointer()`, add the `startCol` offset when converting pointer
   x to grid column.
5. When `viewCols` is not provided, all behaviour is identical to today.

---

### Prompt 4 — SeedScreen mobile layout

**Files**: `src/ui/SeedScreen.tsx`

Tasks:
1. Detect mobile at component level:
   ```ts
   const isMobile = window.matchMedia('(pointer: coarse)').matches;
   ```
2. Pass `viewCols={[0, 40]}` to `LifeCanvas` when `isMobile` is true (show only
   player's left half; AI cells on right are not visible).
3. Remove the absolutely-positioned "What are the rules?" button (`left: 60, top: 50%`).
   On desktop, keep it as-is. On mobile, move it into the controls row at the bottom
   as a regular inline button.
4. On mobile, simplify the HUD to show only the player's own count (not AI count) since
   the AI half is hidden.
5. On mobile, use a column flex layout so HUD → canvas → controls stack vertically and
   fill the screen height.

---

### Prompt 5 — PlayScreen portrait layout

**File**: `src/ui/PlayScreen.tsx`

Tasks:
1. Detect mobile:
   ```ts
   const isMobile = window.matchMedia('(pointer: coarse)').matches;
   ```
2. On mobile, restructure the layout to stack vertically:
   - **Row 1 (HUD)**: player scores with colour dots, same as desktop
   - **Row 2**: Play/Pause button, full width, prominent
   - **Row 3**: Canvas (`LifeCanvas`, full grid, `interactive={false}`)
   - **Row 4**: Step and Restart buttons side by side
3. The canvas flex item should be `flex: 1` so it fills remaining vertical space between
   the play button and the bottom controls.
4. Desktop layout is unchanged.

---

## Out of Scope (for now)

- "See AI cells" button with back function — deferred, revisit after testing
- Zoom-out transition from seed → play — deferred, cut is fine for now
- PWA manifest / add-to-home-screen
- Landscape lock / rotate prompt
