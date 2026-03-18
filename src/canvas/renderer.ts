import { MID_X } from "../game/types";

const GRID_COLOR = "rgba(255,255,255,0.06)";

const OWNER_COLORS: Record<number, string> = {
  0: "#f15f24", // P1 orange
  1: "#86dabd", // P2 mint
};

// Subtle territory tints
const TERRITORY_TINTS: Record<number, string> = {
  0: "rgba(241,95,36,0.03)",  // P1 warm
  1: "rgba(134,218,189,0.03)", // P2 cool
};

const DIVIDER_COLOR = "rgba(255,255,255,0.18)";

export interface DrawOptions {
  showTerritories?: boolean;
}

export interface ViewTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export function draw(
  alive: Uint8Array,
  owner: Int8Array,
  gridW: number,
  gridH: number,
  cellSize: number,
  ctx: CanvasRenderingContext2D,
  options: DrawOptions = {},
  startCol = 0,
  colCount = gridW,
  viewTransform?: ViewTransform,
): void {
  const w = colCount * cellSize;
  const h = gridH * cellSize;

  // Clear full canvas before applying any transform
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  ctx.save();
  if (viewTransform && (viewTransform.zoom !== 1 || viewTransform.panX !== 0 || viewTransform.panY !== 0)) {
    ctx.scale(viewTransform.zoom, viewTransform.zoom);
    ctx.translate(-viewTransform.panX, -viewTransform.panY);
  }

  // Territory tints — clipped to visible column range
  if (options.showTerritories) {
    const visibleMid = Math.max(0, Math.min(colCount, MID_X - startCol));
    if (visibleMid > 0) {
      ctx.fillStyle = TERRITORY_TINTS[0];
      ctx.fillRect(0, 0, visibleMid * cellSize, h);
    }
    if (visibleMid < colCount) {
      ctx.fillStyle = TERRITORY_TINTS[1];
      ctx.fillRect(visibleMid * cellSize, 0, (colCount - visibleMid) * cellSize, h);
    }
  }

  // Draw alive cells grouped by owner for fewer fillStyle swaps
  for (const ownerId of [0, 1]) {
    ctx.fillStyle = OWNER_COLORS[ownerId] ?? "#ffffff";
    for (let y = 0; y < gridH; y++) {
      for (let x = startCol; x < startCol + colCount; x++) {
        const i = y * gridW + x;
        if (alive[i] && owner[i] === ownerId) {
          ctx.fillRect((x - startCol) * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  // Draw grid lines
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let c = 0; c <= colCount; c++) {
    const px = c * cellSize + 0.5;
    ctx.moveTo(px, 0);
    ctx.lineTo(px, h);
  }
  for (let y = 0; y <= gridH; y++) {
    const py = y * cellSize + 0.5;
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
  }

  ctx.stroke();

  // Territory divider — only draw if it falls within the visible column range
  if (options.showTerritories) {
    const midRelative = MID_X - startCol;
    if (midRelative > 0 && midRelative < colCount) {
      const midPx = midRelative * cellSize + 0.5;
      ctx.strokeStyle = DIVIDER_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(midPx, 0);
      ctx.lineTo(midPx, h);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  ctx.restore();
}
