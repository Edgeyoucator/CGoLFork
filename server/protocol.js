// Client -> Server
export const C2S = {
  HELLO: "hello",            // { type, name, clientId }
  LIST_ROOMS: "listRooms",
  JOIN_ROOM: "joinRoom",     // { type, roomId }
  LEAVE_ROOM: "leaveRoom",
  SEED_DELTA: "seedDelta",   // { type, roomId, clientId, baseSeedVersion, changes:[{i, alive}] }
  CLEAR_SEED: "clearSeed",
  SET_READY: "setReady",     // { type, ready }
  PLAY_AGAIN: "playAgain",   // { type, ready }
  WATCH_REPLAY: "watchReplay",
};

// Server -> Client
export const S2C = {
  WELCOME: "welcome",        // { type, clientId }
  ROOM_LIST: "roomList",     // { type, rooms }
  ROOM_JOINED: "roomJoined", // { type, roomId, role, roomState }
  ROOM_STATE: "roomState",   // { type, roomState }
  SEED_STATE: "seedState",   // { type, seedVersion, alive[], owner[] }  (full sync)
  SEED_DELTA_APPLIED: "seedDeltaApplied", // { type, seedVersion, changes:[{i, alive, owner}], appliedBy }
  SEED_DELTA_REJECTED: "seedDeltaRejected", // { type, seedVersion, reason }
  PHASE_CHANGED: "phaseChanged", // { type, phase, tick, running }
  PLAY_TICK: "playTick",
  PLAY_END: "playEnd",
  ERROR: "error",
};
