import { GRID_W, GRID_H, MID_X, idx } from "../game/types";
import type { BoardState } from "../game/types";

export interface InputCallbacks {
  onPaint: () => void;
  getBudgetRemaining: () => number;
}

export function attachInput(
  canvas: HTMLCanvasElement,
  board: BoardState,
  getActivePlayer: () => number, // 0 or 1
  callbacks: InputCallbacks,
): () => void {
  let painting = false;

  function cellFromPointer(e: PointerEvent): { x: number; y: number } | null {
    const rect = canvas.getBoundingClientRect();
    const cellSize = rect.width / GRID_W;
    const x = Math.floor((e.clientX - rect.left) / cellSize);
    const y = Math.floor((e.clientY - rect.top) / cellSize);
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return null;
    return { x, y };
  }

  function isInTerritory(x: number, player: number): boolean {
    if (player === 0) return x < MID_X;
    return x >= MID_X;
  }

  // Click: toggle (place or remove own cell)
  function toggleCell(x: number, y: number): boolean {
    const player = getActivePlayer();
    if (!isInTerritory(x, player)) return false;

    const i = idx(x, y);

    if (board.alive[i]) {
      // Can only remove own cells
      if (board.owner[i] === player) {
        board.alive[i] = 0;
        board.owner[i] = -1;
        return true;
      }
      return false;
    }

    // Place if budget allows
    if (callbacks.getBudgetRemaining() <= 0) return false;
    board.alive[i] = 1;
    board.owner[i] = player as 0 | 1;
    return true;
  }

  // Drag: place or erase (not toggle)
  function dragCell(x: number, y: number, shiftHeld: boolean): boolean {
    const player = getActivePlayer();
    if (!isInTerritory(x, player)) return false;

    const i = idx(x, y);

    if (shiftHeld) {
      // Shift-drag: erase own cells only
      if (board.alive[i] && board.owner[i] === player) {
        board.alive[i] = 0;
        board.owner[i] = -1;
        return true;
      }
      return false;
    }

    // Normal drag: place only (skip if already alive)
    if (board.alive[i]) return false;
    if (callbacks.getBudgetRemaining() <= 0) return false;
    board.alive[i] = 1;
    board.owner[i] = player as 0 | 1;
    return true;
  }

  function onPointerDown(e: PointerEvent) {
    painting = true;
    canvas.setPointerCapture(e.pointerId);

    const cell = cellFromPointer(e);
    if (!cell) return;

    // First click is a toggle
    if (toggleCell(cell.x, cell.y)) {
      callbacks.onPaint();
    }
  }

  function onPointerMove(e: PointerEvent) {
    if (!painting) return;
    const cell = cellFromPointer(e);
    if (!cell) return;

    if (dragCell(cell.x, cell.y, e.shiftKey)) {
      callbacks.onPaint();
    }
  }

  function onPointerUp() {
    painting = false;
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);

  // Prevent context menu on long-press (mobile)
  const preventCtx = (e: Event) => e.preventDefault();
  canvas.addEventListener("contextmenu", preventCtx);

  // Cleanup
  return () => {
    canvas.removeEventListener("pointerdown", onPointerDown);
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerup", onPointerUp);
    canvas.removeEventListener("pointercancel", onPointerUp);
    canvas.removeEventListener("contextmenu", preventCtx);
  };
}
