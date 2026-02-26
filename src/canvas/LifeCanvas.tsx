import { useRef, useEffect, useCallback } from "react";
import type { MutableRefObject } from "react";
import { GRID_W, GRID_H } from "../game/types";
import type { BoardState } from "../game/types";
import { draw } from "./renderer";
import type { DrawOptions } from "./renderer";
import { attachInput } from "./input";
import type { InputCallbacks } from "./input";

interface Props {
  board: BoardState;
  activePlayer?: number;
  onPaint?: () => void;
  getBudgetRemaining?: () => number;
  showTerritories?: boolean;
  interactive?: boolean;
  /** Optional ref that parent can use to trigger imperative redraws */
  redrawRef?: MutableRefObject<(() => void) | null>;
}

export default function LifeCanvas({
  board,
  activePlayer = 0,
  onPaint,
  getBudgetRemaining,
  showTerritories = false,
  interactive = true,
  redrawRef,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePlayerRef = useRef(activePlayer);
  activePlayerRef.current = activePlayer;

  const drawOptions: DrawOptions = { showTerritories };

  const redraw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const cellSize = cvs.width / GRID_W;
    draw(board.alive, board.owner, GRID_W, GRID_H, cellSize, ctx, drawOptions);
  }, [board, showTerritories]);

  // Expose redraw to parent
  useEffect(() => {
    if (redrawRef) {
      redrawRef.current = redraw;
      return () => { redrawRef.current = null; };
    }
  }, [redraw, redrawRef]);

  // Resize canvas to fit container while maintaining grid aspect ratio
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const parent = cvs.parentElement;
    if (!parent) return;

    function resize() {
      const pw = parent!.clientWidth;
      const ph = parent!.clientHeight;
      const aspect = GRID_W / GRID_H;
      let w = pw;
      let h = pw / aspect;
      if (h > ph) {
        h = ph;
        w = ph * aspect;
      }
      const cellSize = Math.floor(w / GRID_W);
      cvs!.width = cellSize * GRID_W;
      cvs!.height = cellSize * GRID_H;
      cvs!.style.width = cvs!.width + "px";
      cvs!.style.height = cvs!.height + "px";
      redraw();
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  // Attach pointer input (only in interactive mode)
  useEffect(() => {
    if (!interactive) return;
    const cvs = canvasRef.current;
    if (!cvs) return;

    const callbacks: InputCallbacks = {
      onPaint: () => {
        redraw();
        onPaint?.();
      },
      getBudgetRemaining: getBudgetRemaining ?? (() => Infinity),
    };

    const cleanup = attachInput(
      cvs,
      board,
      () => activePlayerRef.current,
      callbacks,
    );
    return cleanup;
  }, [board, redraw, onPaint, getBudgetRemaining, interactive]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: "block",
          cursor: interactive ? "crosshair" : "default",
        }}
      />
    </div>
  );
}
