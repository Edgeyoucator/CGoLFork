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
  /** Restrict rendering and input to a column range, e.g. [0, 40] for left half */
  viewCols?: [number, number];
}

export default function LifeCanvas({
  board,
  activePlayer = 0,
  onPaint,
  getBudgetRemaining,
  showTerritories = false,
  interactive = true,
  redrawRef,
  viewCols,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activePlayerRef = useRef(activePlayer);
  activePlayerRef.current = activePlayer;

  const drawOptions: DrawOptions = { showTerritories };
  const startCol = viewCols ? viewCols[0] : 0;
  const colCount = viewCols ? viewCols[1] - viewCols[0] : GRID_W;

  const redraw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const cellSize = cvs.width / colCount;
    draw(board.alive, board.owner, GRID_W, GRID_H, cellSize, ctx, drawOptions, startCol, colCount);
  }, [board, showTerritories, startCol, colCount]);

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
      const aspect = colCount / GRID_H;
      let w = pw;
      let h = pw / aspect;
      if (h > ph) {
        h = ph;
        w = ph * aspect;
      }
      const cellSize = Math.floor(w / colCount);
      cvs!.width = cellSize * colCount;
      cvs!.height = cellSize * GRID_H;
      cvs!.style.width = cvs!.width + "px";
      cvs!.style.height = cvs!.height + "px";
      redraw();
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  // Stable callbacks ref — properties updated each render so the
  // attachment effect never needs to re-run just because counts changed.
  const callbacksRef = useRef<InputCallbacks>({
    onPaint: () => {},
    getBudgetRemaining: () => Infinity,
  });
  callbacksRef.current.onPaint = () => { redraw(); onPaint?.(); };
  callbacksRef.current.getBudgetRemaining = getBudgetRemaining ?? (() => Infinity);

  // Attach pointer input (only in interactive mode)
  // Re-attach only when board or interactive changes, not on every repaint.
  useEffect(() => {
    if (!interactive) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const cleanup = attachInput(cvs, board, () => activePlayerRef.current, callbacksRef.current, viewCols);
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, interactive]);

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
          background: "rgba(22, 34, 55, 0.93)",
          touchAction: "none",
        }}
      />
    </div>
  );
}
