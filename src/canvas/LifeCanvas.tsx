import { useRef, useEffect, useCallback, useState } from "react";
import type { MutableRefObject } from "react";
import { GRID_W, GRID_H } from "../game/types";
import type { BoardState } from "../game/types";
import { draw } from "./renderer";
import type { DrawOptions } from "./renderer";
import { attachInput } from "./input";
import type { ViewTransform } from "./input";
import type { InputCallbacks } from "./input";

const MAX_ZOOM = 5;

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

  // Mutable view transform — never replaced, only mutated in-place
  const viewTransformRef = useRef<ViewTransform>({ zoom: 1, panX: 0, panY: 0 });
  const isMobile = window.matchMedia("(pointer: coarse)").matches;
  // Only re-renders when zoom crosses the 1 threshold (to show/hide pan arrows)
  const [isZoomed, setIsZoomed] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const panRafRef = useRef<number | null>(null);
  const zoomRafRef = useRef<number | null>(null);

  const drawOptions: DrawOptions = { showTerritories };
  const startCol = viewCols ? viewCols[0] : 0;
  const colCount = viewCols ? viewCols[1] - viewCols[0] : GRID_W;

  const redraw = useCallback(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const cellSize = cvs.width / colCount;
    draw(board.alive, board.owner, GRID_W, GRID_H, cellSize, ctx, drawOptions, startCol, colCount, viewTransformRef.current);
  }, [board, showTerritories, startCol, colCount]);

  function stopPan() {
    if (panRafRef.current !== null) {
      cancelAnimationFrame(panRafRef.current);
      panRafRef.current = null;
    }
  }

  function startPan(dirX: number, dirY: number) {
    stopPan();
    const step = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const vt = viewTransformRef.current;
      const cellPx = cvs.width / colCount / 3;
      const maxPanX = cvs.width * (1 - 1 / vt.zoom);
      const maxPanY = cvs.height * (1 - 1 / vt.zoom);
      vt.panX = Math.max(0, Math.min(maxPanX, vt.panX + dirX * cellPx));
      vt.panY = Math.max(0, Math.min(maxPanY, vt.panY + dirY * cellPx));
      redraw();
      panRafRef.current = requestAnimationFrame(step);
    };
    panRafRef.current = requestAnimationFrame(step);
  }

  function stopZoom() {
    if (zoomRafRef.current !== null) {
      cancelAnimationFrame(zoomRafRef.current);
      zoomRafRef.current = null;
    }
  }

  function startZoom(direction: 1 | -1) {
    stopZoom();
    const doStep = () => {
      const cvs = canvasRef.current;
      if (!cvs) return;
      const vt = viewTransformRef.current;
      const factor = direction > 0 ? 1.025 : 1 / 1.025;
      const newZoom = Math.max(1, Math.min(MAX_ZOOM, vt.zoom * factor));
      if (newZoom === vt.zoom) return; // at limit, stop
      // Keep current view centre fixed
      const centerX = vt.panX + cvs.width / (2 * vt.zoom);
      const centerY = vt.panY + cvs.height / (2 * vt.zoom);
      const maxPanX = cvs.width * (1 - 1 / newZoom);
      const maxPanY = cvs.height * (1 - 1 / newZoom);
      vt.panX = Math.max(0, Math.min(maxPanX, centerX - cvs.width / (2 * newZoom)));
      vt.panY = Math.max(0, Math.min(maxPanY, centerY - cvs.height / (2 * newZoom)));
      vt.zoom = newZoom;
      // Only trigger React re-render when crossing the zoom=1 boundary
      const nowZoomed = newZoom > 1;
      if (nowZoomed !== (vt.zoom > 1 + 1e-9 || false)) setIsZoomed(nowZoomed);
      setIsZoomed(nowZoomed);
      redraw();
      zoomRafRef.current = requestAnimationFrame(doStep);
    };
    doStep(); // immediate first step so a tap registers
  }

  // Cancel loops on unmount
  useEffect(() => () => { stopPan(); stopZoom(); }, []);

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
      setCanvasSize({ w: cvs!.width, h: cvs!.height });
      redraw();
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [redraw]);

  // Stable callbacks ref
  const callbacksRef = useRef<InputCallbacks>({
    onPaint: () => {},
    getBudgetRemaining: () => Infinity,
  });
  callbacksRef.current.onPaint = () => { redraw(); onPaint?.(); };
  callbacksRef.current.getBudgetRemaining = getBudgetRemaining ?? (() => Infinity);

  // Attach pointer input (only in interactive mode)
  useEffect(() => {
    if (!interactive) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    // Reset view when input re-attaches (new game/board)
    const vt = viewTransformRef.current;
    vt.zoom = 1; vt.panX = 0; vt.panY = 0;
    setIsZoomed(false);
    const cleanup = attachInput(cvs, board, () => activePlayerRef.current, callbacksRef.current, viewCols, viewTransformRef.current);
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board, interactive]);

  // Shared style for all overlay buttons (zoom + pan)
  const overlayBtn = (label: string, pos: React.CSSProperties, onDown: (e: React.PointerEvent) => void, onUp: () => void, extraStyle?: React.CSSProperties): React.ReactNode => (
    <div
      key={label}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); onDown(e); }}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      style={{
        position: "absolute",
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.12)",
        border: "1px solid rgba(255,255,255,0.22)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 18,
        fontWeight: 300,
        color: "rgba(255,255,255,0.9)",
        userSelect: "none",
        touchAction: "none",
        pointerEvents: "auto",
        cursor: "pointer",
        ...pos,
        ...extraStyle,
      }}
    >{label}</div>
  );

  const zoomBtnStyle: React.CSSProperties = {
    background: "rgba(134,218,189,0.25)",
    border: "1px solid rgba(134,218,189,0.6)",
    color: "#86dabd",
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Single overlay: zoom buttons always visible, pan arrows when zoomed */}
      {interactive && isMobile && canvasSize.w > 0 && (
        <div style={{
          position: "absolute",
          width: canvasSize.w,
          height: canvasSize.h,
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          pointerEvents: "none",
          zIndex: 2,
        }}>
          {/* Zoom + — upper third */}
          {overlayBtn("+",
            { left: 6, top: "25%", transform: "translateY(-50%)" },
            () => startZoom(1), stopZoom, zoomBtnStyle,
          )}
          {/* Zoom − — lower third */}
          {overlayBtn("−",
            { left: 6, top: "75%", transform: "translateY(-50%)" },
            () => startZoom(-1), stopZoom, zoomBtnStyle,
          )}
          {/* Pan arrows — only when zoomed in */}
          {isZoomed && overlayBtn("▲", { top: 6, left: "50%", transform: "translateX(-50%)" }, () => startPan(0, -1), stopPan)}
          {isZoomed && overlayBtn("▼", { bottom: 6, left: "50%", transform: "translateX(-50%)" }, () => startPan(0,  1), stopPan)}
          {isZoomed && overlayBtn("◀", { left: 6, top: "50%", transform: "translateY(-50%)" },    () => startPan(-1, 0), stopPan)}
          {isZoomed && overlayBtn("▶", { right: 6, top: "50%", transform: "translateY(-50%)" },   () => startPan( 1, 0), stopPan)}
        </div>
      )}
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
