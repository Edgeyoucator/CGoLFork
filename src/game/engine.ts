/**
 * Conway Life engine with ownership tracking.
 * Uses double-buffered arrays — caller provides both sets.
 */

export function stepLife(
  alive: Uint8Array,
  owner: Int8Array,
  nextAlive: Uint8Array,
  nextOwner: Int8Array,
  width: number,
  height: number,
): void {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;

      // Count neighbours + ownership tally
      let neighbours = 0;
      let p1 = 0;
      let p2 = 0;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          const ni = ny * width + nx;
          if (alive[ni]) {
            neighbours++;
            if (owner[ni] === 0) p1++;
            else if (owner[ni] === 1) p2++;
          }
        }
      }

      if (alive[i]) {
        // Survival: 2 or 3 neighbours
        if (neighbours === 2 || neighbours === 3) {
          nextAlive[i] = 1;
          nextOwner[i] = owner[i];
        } else {
          nextAlive[i] = 0;
          nextOwner[i] = -1;
        }
      } else {
        // Birth: exactly 3 neighbours
        if (neighbours === 3) {
          // Majority ownership
          if (p1 > p2) {
            nextAlive[i] = 1;
            nextOwner[i] = 0;
          } else if (p2 > p1) {
            nextAlive[i] = 1;
            nextOwner[i] = 1;
          } else {
            // Tie — no birth
            nextAlive[i] = 0;
            nextOwner[i] = -1;
          }
        } else {
          nextAlive[i] = 0;
          nextOwner[i] = -1;
        }
      }
    }
  }
}

export function countLiveByPlayer(
  alive: Uint8Array,
  owner: Int8Array,
  total: number,
): { p1: number; p2: number; total: number } {
  let p1 = 0;
  let p2 = 0;
  let live = 0;
  for (let i = 0; i < total; i++) {
    if (alive[i]) {
      live++;
      if (owner[i] === 0) p1++;
      else if (owner[i] === 1) p2++;
    }
  }
  return { p1, p2, total: live };
}
