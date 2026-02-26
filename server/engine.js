// Duplicated from src/game/engine.ts for the Node server.
// TODO: Unify into a shared package when build setup supports it.

export const GRID_W = 80;
export const GRID_H = 50;
export const MID_X = GRID_W / 2;
export const DEFAULT_BUDGET = 25;
export const TOTAL = GRID_W * GRID_H;

export function stepLife(alive, owner, nextAlive, nextOwner, width, height) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
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
        if (neighbours === 2 || neighbours === 3) {
          nextAlive[i] = 1;
          nextOwner[i] = owner[i];
        } else {
          nextAlive[i] = 0;
          nextOwner[i] = -1;
        }
      } else {
        if (neighbours === 3) {
          if (p1 > p2) {
            nextAlive[i] = 1;
            nextOwner[i] = 0;
          } else if (p2 > p1) {
            nextAlive[i] = 1;
            nextOwner[i] = 1;
          } else {
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

export function countLive(alive, owner, total) {
  let p1 = 0;
  let p2 = 0;
  for (let i = 0; i < total; i++) {
    if (alive[i]) {
      if (owner[i] === 0) p1++;
      else if (owner[i] === 1) p2++;
    }
  }
  return { p1, p2 };
}

export function getWinner(p1, p2) {
  if (p1 > p2) return "P1";
  if (p2 > p1) return "P2";
  return "Draw";
}
