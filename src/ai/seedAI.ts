export type SeedAIInput = {
  width: number;
  height: number;
  budget: number;
  side: "right";
  rngSeed: number;
};

const PATTERNS: Array<{ name: string; cells: Array<[number, number]> }> = [
  // Weighted toward chaotic by repetition
  { name: "r_pentomino", cells: [[1,0],[2,0],[0,1],[1,1],[1,2]] },
  { name: "r_pentomino", cells: [[1,0],[2,0],[0,1],[1,1],[1,2]] },
  { name: "acorn",       cells: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]] },
  { name: "acorn",       cells: [[1,0],[3,1],[0,2],[1,2],[4,2],[5,2],[6,2]] },
  { name: "diehard",     cells: [[6,0],[0,1],[1,1],[1,2],[5,2],[6,2],[7,2]] },
  { name: "glider",      cells: [[1,0],[2,1],[0,2],[1,2],[2,2]] },
  { name: "beacon",      cells: [[0,0],[1,0],[0,1],[3,2],[2,3],[3,3]] },
];

// Small clusters used to spend leftover budget — survive long enough to interact
const FILLERS: Array<Array<[number, number]>> = [
  [[0,0],[1,0],[0,1],[1,1]],   // block (stable)
  [[0,1],[1,1],[2,1]],         // blinker (oscillates)
  [[0,0],[1,0],[2,0]],         // row of 3 — evolves into blinker
  [[0,0],[1,1],[0,1]],         // L-tromino — short-lived but not instant
];

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function seedAI(input: SeedAIInput): number[] {
  const { width, height, budget, side, rngSeed } = input;
  const midX = Math.floor(width / 2);
  const margin = 2;
  const minX = side === "right" ? midX + margin : margin;
  const maxX = width - 1 - margin;
  const minY = margin;
  const maxY = height - 1 - margin;

  const rng = mulberry32(rngSeed);
  const used = new Set<number>();
  const centers: Array<{ x: number; y: number }> = [];

  const tryPlacePattern = (pattern: Array<[number, number]>): boolean => {
    const pw = Math.max(...pattern.map((p) => p[0])) + 1;
    const ph = Math.max(...pattern.map((p) => p[1])) + 1;
    if (maxX - pw + 1 < minX || maxY - ph + 1 < minY) return false;

    const x0 = randInt(rng, minX, maxX - pw + 1);
    const y0 = randInt(rng, minY, maxY - ph + 1);

    for (const [dx, dy] of pattern) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < minX || x > maxX || y < minY || y > maxY) return false;
      if (x < midX) return false;
      if (used.has(y * width + x)) return false;
    }

    for (const [dx, dy] of pattern) {
      used.add((y0 + dy) * width + (x0 + dx));
    }
    centers.push({ x: x0 + Math.floor(pw / 2), y: y0 + Math.floor(ph / 2) });
    return true;
  };

  // Place main chaotic patterns
  const targetPatterns = randInt(rng, 3, 5);
  let attempts = 0;
  while (centers.length < targetPatterns && attempts < 40) {
    attempts++;
    const pattern = PATTERNS[randInt(rng, 0, PATTERNS.length - 1)];
    if (used.size + pattern.cells.length > budget) continue;
    tryPlacePattern(pattern.cells);
  }

  // Fill remaining budget with small clusters near existing patterns (not lone cells)
  let remaining = budget - used.size;
  let fillerAttempts = 0;
  while (remaining > 0 && fillerAttempts < 200) {
    fillerAttempts++;
    const filler = FILLERS[randInt(rng, 0, FILLERS.length - 1)];
    if (filler.length > remaining) continue;

    // Place near an existing pattern center for interesting interactions
    let base;
    if (centers.length > 0) {
      base = centers[randInt(rng, 0, centers.length - 1)];
    } else {
      base = { x: randInt(rng, minX, maxX), y: randInt(rng, minY, maxY) };
    }

    const offsetX = randInt(rng, -3, 3);
    const offsetY = randInt(rng, -3, 3);
    const shifted = filler.map(([dx, dy]) => [dx + offsetX, dy + offsetY] as [number, number]);

    const valid = shifted.every(([dx, dy]) => {
      const x = base.x + dx;
      const y = base.y + dy;
      return x >= minX && x <= maxX && x >= midX && y >= minY && y <= maxY && !used.has(y * width + x);
    });

    if (valid) {
      for (const [dx, dy] of shifted) {
        used.add((base.y + dy) * width + (base.x + dx));
      }
      remaining -= filler.length;
    }
  }

  return Array.from(used);
}
