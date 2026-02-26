// Client -> Server message types
export const C2S = {
  HELLO: "hello",
  LIST_ROOMS: "listRooms",
  JOIN_ROOM: "joinRoom",
  LEAVE_ROOM: "leaveRoom",
  SEED_DELTA: "seedDelta",
  CLEAR_SEED: "clearSeed",
  SET_READY: "setReady",
  PLAY_AGAIN: "playAgain",
  WATCH_REPLAY: "watchReplay",
} as const;

// Server -> Client message types
export const S2C = {
  WELCOME: "welcome",
  ROOM_LIST: "roomList",
  ROOM_JOINED: "roomJoined",
  ROOM_STATE: "roomState",
  SEED_STATE: "seedState",
  SEED_DELTA_APPLIED: "seedDeltaApplied",
  SEED_DELTA_REJECTED: "seedDeltaRejected",
  PHASE_CHANGED: "phaseChanged",
  PLAY_TICK: "playTick",
  PLAY_END: "playEnd",
  ERROR: "error",
} as const;

export interface RoomPlayer {
  name: string;
  role: number; // 0 = P1, 1 = P2
}

export interface RoomInfo {
  id: number;
  name: string;
  phase: "seed" | "play" | "done";
  players: (RoomPlayer | null)[];
  spectatorCount: number;
}

export interface RoomState {
  players: (RoomPlayer | null)[];
  ready: [boolean, boolean];
  playAgainReady?: [boolean, boolean];
  phase: "seed" | "play" | "done";
  tick: number;
  spectatorCount: number;
}

export interface SeedDeltaChange {
  i: number;
  alive: 0 | 1;
  owner: number;
}

export interface SeedDeltaRejected {
  seedVersion: number;
  reason: string;
}
