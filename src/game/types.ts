export const GRID_W = 80;
export const GRID_H = 50;
export const MID_X = GRID_W / 2; // 40
export const DEFAULT_BUDGET = 25;

export interface BoardState {
  alive: Uint8Array;
  owner: Int8Array; // -1 = unowned, 0 = P1, 1 = P2
}

export interface PlayerInfo {
  name: string;
  color: string; // CSS color
}

export type Screen = "lobby" | "mode" | "rooms" | "seed" | "play";

export function createBoard(): BoardState {
  const total = GRID_W * GRID_H;
  const alive = new Uint8Array(total);
  const owner = new Int8Array(total).fill(-1);
  return { alive, owner };
}

export function clearBoard(board: BoardState): void {
  board.alive.fill(0);
  board.owner.fill(-1);
}

export function idx(x: number, y: number): number {
  return y * GRID_W + x;
}

export interface SeedSnapshot {
  alive: Uint8Array;
  owner: Int8Array;
}

export function snapshotBoard(board: BoardState): SeedSnapshot {
  return {
    alive: new Uint8Array(board.alive),
    owner: new Int8Array(board.owner),
  };
}

export function restoreBoard(board: BoardState, snapshot: SeedSnapshot): void {
  board.alive.set(snapshot.alive);
  board.owner.set(snapshot.owner);
}

export function countCells(board: BoardState): [number, number] {
  const total = GRID_W * GRID_H;
  let c0 = 0;
  let c1 = 0;
  for (let i = 0; i < total; i++) {
    if (board.alive[i]) {
      if (board.owner[i] === 0) c0++;
      else if (board.owner[i] === 1) c1++;
    }
  }
  return [c0, c1];
}
