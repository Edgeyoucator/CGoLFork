export type SeedAIInput = {
  width: number;
  height: number;
  budget: number;
  side: "right";
  rngSeed: number;
};

const PATTERNS: Array<{ name: string; cells: Array<[number, number]> }> = [
  { name: "block", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: "blinker", cells: [[0, 0], [1, 0], [2, 0]] },
  { name: "beacon", cells: [[0, 0], [1, 0], [0, 1], [3, 2], [2, 3], [3, 3]] },
  { name: "glider", cells: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]] },
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
    const w = Math.max(...pattern.map((p) => p[0])) + 1;
    const h = Math.max(...pattern.map((p) => p[1])) + 1;
    const x0 = randInt(rng, minX, maxX - w + 1);
    const y0 = randInt(rng, minY, maxY - h + 1);

    for (const [dx, dy] of pattern) {
      const x = x0 + dx;
      const y = y0 + dy;
      if (x < minX || x > maxX || y < minY || y > maxY) return false;
      if (x < midX) return false;
      const i = y * width + x;
      if (used.has(i)) return false;
    }

    for (const [dx, dy] of pattern) {
      const x = x0 + dx;
      const y = y0 + dy;
      const i = y * width + x;
      used.add(i);
    }
    centers.push({ x: x0 + Math.floor(w / 2), y: y0 + Math.floor(h / 2) });
    return true;
  };

  const targetPatterns = randInt(rng, 2, 4);
  let attempts = 0;
  while (centers.length < targetPatterns && attempts < 40) {
    attempts++;
    const pattern = PATTERNS[randInt(rng, 0, PATTERNS.length - 1)];
    if (used.size + pattern.cells.length > budget) continue;
    tryPlacePattern(pattern.cells);
  }

  let remaining = budget - used.size;
  let noiseAttempts = 0;
  while (remaining > 0 && noiseAttempts < 200) {
    noiseAttempts++;
    let base;
    if (centers.length > 0) {
      base = centers[randInt(rng, 0, centers.length - 1)];
    } else {
      base = { x: randInt(rng, minX, maxX), y: randInt(rng, minY, maxY) };
    }
    const x = Math.min(maxX, Math.max(minX, base.x + randInt(rng, -2, 2)));
    const y = Math.min(maxY, Math.max(minY, base.y + randInt(rng, -2, 2)));
    if (x < midX) continue;
    const i = y * width + x;
    if (used.has(i)) continue;
    used.add(i);
    remaining--;
  }

  let fallbackAttempts = 0;
  while (remaining > 0 && fallbackAttempts < 1000) {
    fallbackAttempts++;
    const x = randInt(rng, minX, maxX);
    const y = randInt(rng, minY, maxY);
    const i = y * width + x;
    if (used.has(i)) continue;
    used.add(i);
    remaining--;
  }

  return Array.from(used);
}
