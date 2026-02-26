import {
  GRID_W, GRID_H, MID_X, DEFAULT_BUDGET, TOTAL,
  stepLife, countLive, getWinner,
} from "./engine.js";
import { S2C } from "./protocol.js";
import { upsertLeaderboardEntry } from "./leaderboard.js";

const MAX_TICKS = 100;
const TICK_RATE = 12;
const TICK_MS = 1000 / TICK_RATE;
const NUM_ROOMS = 20;
const LOOP_HISTORY = 6;
const LOOP_STREAK_REQUIRED = 15;

const PHASE = { SEED: "seed", PLAY: "play", DONE: "done" };
const DEBUG_SYNC = false;

// Create all rooms
const rooms = [];
for (let i = 0; i < NUM_ROOMS; i++) {
  rooms.push({
    id: i,
    name: `Room ${i + 1}`,
    // Player slots: store clientId (not ws) for persistence across reconnects
    playerClientIds: [null, null],
    playerWs: [null, null],
    playerNames: ["", ""],
    spectators: new Set(), // Set of ws
    ready: [false, false],
    playAgainReady: [false, false],
    phase: PHASE.SEED,
    seedVersion: 0,
    alive: new Uint8Array(TOTAL),
    owner: new Int8Array(TOTAL).fill(-1),
    seedAlive: null,
    seedOwner: null,
    tick: 0,
    tickInterval: null,
    nextAlive: new Uint8Array(TOTAL),
    nextOwner: new Int8Array(TOTAL),
    hashHistory: [],
    loopStreak: 0,
  });
}

// All connected clients
const allClients = new Set();

export function registerClient(ws) {
  allClients.add(ws);
}

export function unregisterClient(ws) {
  allClients.delete(ws);
}

// --- Room list ---

export function getRoomList() {
  return rooms.map((r) => ({
    id: r.id,
    name: r.name,
    phase: r.phase,
    players: r.playerClientIds.map((cid, i) =>
      cid ? { name: r.playerNames[i], role: i } : null
    ),
    spectatorCount: r.spectators.size,
  }));
}

export function broadcastRoomList() {
  const msg = JSON.stringify({ type: S2C.ROOM_LIST, rooms: getRoomList() });
  for (const ws of allClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

// --- Room state ---

function getRoomState(room) {
  return {
    players: room.playerClientIds.map((cid, i) =>
      cid ? { name: room.playerNames[i], role: i } : null
    ),
    ready: [...room.ready],
    playAgainReady: [...room.playAgainReady],
    phase: room.phase,
    tick: room.tick,
    spectatorCount: room.spectators.size,
  };
}

function broadcastRoomState(room) {
  broadcastToAll(room, {
    type: S2C.ROOM_STATE,
    roomState: getRoomState(room),
  });
}

// --- Join / Leave ---

export function joinRoom(roomId, ws, spectate = false) {
  const room = rooms[roomId];
  if (!room) return { error: "Invalid room" };

  const clientId = ws.clientId;
  if (!clientId) return { error: "Missing clientId" };

  if (spectate) {
    room.spectators.add(ws);
    sendFullSync(room, ws, "spectator");
    broadcastRoomState(room);
    return { role: "spectator", roomState: getRoomState(room) };
  }

  // Check if this clientId already holds a player slot (reconnect)
  for (let i = 0; i < 2; i++) {
    if (room.playerClientIds[i] && room.playerClientIds[i] === clientId) {
      // Reconnect: reclaim slot
      room.playerWs[i] = ws;
      room.playerNames[i] = ws.playerName || room.playerNames[i];

      // Send full state to reconnecting client
      sendFullSync(room, ws, i);
      broadcastRoomState(room);
      return { role: i, roomState: getRoomState(room) };
    }
  }

  // Try to claim a player slot
  let role = -1;
  if (!room.playerClientIds[0]) role = 0;
  else if (!room.playerClientIds[1]) role = 1;

  if (role >= 0) {
    room.playerClientIds[role] = clientId;
    room.playerWs[role] = ws;
    room.playerNames[role] = ws.playerName || "Unknown";
    room.ready[role] = false;

    // If room was done/play and someone new joins a player slot, reset
    if (room.phase !== PHASE.SEED) {
      resetRoom(room);
    }

    sendFullSync(room, ws, role);
    broadcastRoomState(room);
    return { role, roomState: getRoomState(room) };
  }

  // Both player slots taken — join as spectator
  room.spectators.add(ws);
  sendFullSync(room, ws, "spectator");
  broadcastRoomState(room);
  return { role: "spectator", roomState: getRoomState(room) };
}

function sendFullSync(room, ws, role) {
  // Send current seed/board state
  ws.send(JSON.stringify({
    type: S2C.SEED_STATE,
    seedVersion: room.seedVersion,
    alive: Array.from(room.alive),
    owner: Array.from(room.owner),
  }));

  // If in play/done, also send current tick state
  if (room.phase === PHASE.PLAY) {
    const c = countLive(room.alive, room.owner, TOTAL);
    ws.send(JSON.stringify({
      type: S2C.PLAY_TICK,
      tick: room.tick,
      alive: Array.from(room.alive),
      owner: Array.from(room.owner),
      p1Live: c.p1,
      p2Live: c.p2,
    }));
  } else if (room.phase === PHASE.DONE) {
    const c = countLive(room.alive, room.owner, TOTAL);
    ws.send(JSON.stringify({
      type: S2C.PLAY_END,
      tick: room.tick,
      alive: Array.from(room.alive),
      owner: Array.from(room.owner),
      p1Live: c.p1,
      p2Live: c.p2,
      winner: getWinner(c.p1, c.p2),
    }));
  }
}

function sendSeedState(room, ws) {
  ws.send(JSON.stringify({
    type: S2C.SEED_STATE,
    seedVersion: room.seedVersion,
    alive: Array.from(room.alive),
    owner: Array.from(room.owner),
  }));
}

function broadcastSeedState(room) {
  broadcastToAll(room, {
    type: S2C.SEED_STATE,
    seedVersion: room.seedVersion,
    alive: Array.from(room.alive),
    owner: Array.from(room.owner),
  });
}

export function leaveRoom(roomId, ws) {
  const room = rooms[roomId];
  if (!room) return;

  const clientId = ws.clientId;

  // Check if player
  for (let i = 0; i < 2; i++) {
    if (room.playerClientIds[i] === clientId) {
      room.playerClientIds[i] = null;
      room.playerWs[i] = null;
      room.playerNames[i] = "";
      room.ready[i] = false;
      room.playAgainReady[i] = false;

      // Stop simulation if running
      if (room.tickInterval) {
        clearInterval(room.tickInterval);
        room.tickInterval = null;
      }
      room.phase = PHASE.SEED;

      broadcastRoomState(room);
      broadcastRoomList();
      return;
    }
  }

  // Check if spectator
  room.spectators.delete(ws);
  broadcastRoomState(room);
  broadcastRoomList();
}

export function handleDisconnect(roomId, ws) {
  const room = rooms[roomId];
  if (!room) return;

  // For players: keep the slot reserved (clientId stays), just clear the ws
  for (let i = 0; i < 2; i++) {
    if (room.playerWs[i] === ws) {
      room.playerWs[i] = null;
      // Don't clear clientId — they can reconnect
      broadcastRoomState(room);
      return;
    }
  }

  // For spectators: remove entirely
  room.spectators.delete(ws);
  broadcastRoomState(room);
}

// --- Seed deltas ---

export function handleSeedDelta(roomId, ws, baseSeedVersion, changes) {
  const room = rooms[roomId];
  if (!room || room.phase !== PHASE.SEED) return;

  const role = getPlayerRole(room, ws);
  if (role === -1) {
    sendSeedDeltaRejected(room, ws, "spectator");
    return;
  }

  if (baseSeedVersion !== room.seedVersion) {
    if (DEBUG_SYNC) {
      console.log(`[seed] reject outOfSync client=${ws.clientId} base=${baseSeedVersion} server=${room.seedVersion}`);
    }
    sendSeedDeltaRejected(room, ws, "outOfSync");
    sendSeedState(room, ws);
    return;
  }

  // Count current cells for this player
  let currentCount = 0;
  for (let i = 0; i < TOTAL; i++) {
    if (room.alive[i] && room.owner[i] === role) currentCount++;
  }

  const tempAlive = new Uint8Array(room.alive);
  const tempOwner = new Int8Array(room.owner);
  const appliedChanges = [];

  for (const change of changes) {
    const i = change.i;
    if (i < 0 || i >= TOTAL) {
      return rejectAndResync(room, ws, "outOfBounds");
    }

    const x = i % GRID_W;
    const inTerritory = role === 0 ? x < MID_X : x >= MID_X;
    if (!inTerritory) {
      return rejectAndResync(room, ws, "territory");
    }

    if (change.alive === 1) {
      if (tempAlive[i]) {
        // No-op if already alive
        continue;
      }
      if (currentCount >= DEFAULT_BUDGET) {
        return rejectAndResync(room, ws, "budget");
      }
      tempAlive[i] = 1;
      tempOwner[i] = role;
      currentCount++;
      appliedChanges.push({ i, alive: 1, owner: role });
    } else {
      if (!tempAlive[i]) continue;
      if (tempOwner[i] !== role) {
        return rejectAndResync(room, ws, "notOwner");
      }
      tempAlive[i] = 0;
      tempOwner[i] = -1;
      currentCount--;
      appliedChanges.push({ i, alive: 0, owner: -1 });
    }
  }

  if (appliedChanges.length === 0) {
    return rejectAndResync(room, ws, "noChanges");
  }

  room.alive.set(tempAlive);
  room.owner.set(tempOwner);
  room.seedVersion += 1;

  // Unready both players
  room.ready = [false, false];

  if (DEBUG_SYNC) {
    console.log(`[seed] applied v=${room.seedVersion} by=${role === 0 ? "P1" : "P2"} changes=${appliedChanges.length}`);
  }

  // Broadcast delta to all clients in room
  broadcastToAll(room, {
    type: S2C.SEED_DELTA_APPLIED,
    seedVersion: room.seedVersion,
    changes: appliedChanges,
    appliedBy: role === 0 ? "P1" : "P2",
  });

  broadcastRoomState(room);
}

export function handleClearSeed(roomId, ws) {
  const room = rooms[roomId];
  if (!room || room.phase !== PHASE.SEED) return;

  const role = getPlayerRole(room, ws);
  if (role === -1) return;

  const changes = [];
  for (let i = 0; i < TOTAL; i++) {
    if (room.alive[i] && room.owner[i] === role) {
      room.alive[i] = 0;
      room.owner[i] = -1;
      changes.push({ i, alive: 0, owner: -1 });
    }
  }

  room.ready = [false, false];

  if (changes.length > 0) {
    room.seedVersion += 1;
    broadcastToAll(room, {
      type: S2C.SEED_DELTA_APPLIED,
      seedVersion: room.seedVersion,
      changes,
      appliedBy: role === 0 ? "P1" : "P2",
    });
  }

  broadcastRoomState(room);
}

// --- Ready / Start ---

export function handleSetReady(roomId, ws, ready) {
  const room = rooms[roomId];
  if (!room || room.phase !== PHASE.SEED) return;

  const role = getPlayerRole(room, ws);
  if (role === -1) return; // spectators can't ready

  room.ready[role] = ready;
  broadcastRoomState(room);

  // Auto-start check
  if (
    room.ready[0] && room.ready[1] &&
    room.playerClientIds[0] && room.playerClientIds[1]
  ) {
    startSimulation(room);
  }
}

export function handlePlayAgain(roomId, ws, ready) {
  const room = rooms[roomId];
  if (!room || room.phase !== PHASE.DONE) return;

  const role = getPlayerRole(room, ws);
  if (role === -1) return;

  room.playAgainReady[role] = !!ready;
  broadcastRoomState(room);

  if (
    room.playAgainReady[0] && room.playAgainReady[1] &&
    room.playerClientIds[0] && room.playerClientIds[1]
  ) {
    // Return to seed with the last saved seed snapshot (retain players' cells)
    room.phase = PHASE.SEED;
    room.tick = 0;
    room.ready = [false, false];
    room.playAgainReady = [false, false];
    if (room.seedAlive && room.seedOwner) {
      room.alive.set(room.seedAlive);
      room.owner.set(room.seedOwner);
    }
    room.seedVersion += 1;
    broadcastRoomState(room);
    broadcastRoomList();
    broadcastSeedState(room);
  }
}

// --- Replay ---

export function handleWatchReplay(roomId, ws) {
  const room = rooms[roomId];
  if (!room || room.phase !== PHASE.DONE) return;
  if (!room.seedAlive || !room.seedOwner) return;

  const role = getPlayerRole(room, ws);
  if (role === -1) return; // spectators can't trigger replay

  // Restore seed snapshot
  room.alive.set(room.seedAlive);
  room.owner.set(room.seedOwner);
  room.tick = 0;

  startSimulation(room);
}

// --- Simulation ---

function startSimulation(room) {
  // Snapshot seed (only if not already done — replay reuses existing snapshot)
  if (room.phase === PHASE.SEED) {
    room.seedAlive = new Uint8Array(room.alive);
    room.seedOwner = new Int8Array(room.owner);
  }

  room.phase = PHASE.PLAY;
  room.tick = 0;
  room.hashHistory = [];
  room.loopStreak = 0;

  if (DEBUG_SYNC) {
    console.log(`[phase] play start v=${room.seedVersion}`);
  }

  // Mandatory resync before play start
  broadcastSeedState(room);
  broadcastRoomState(room);
  broadcastRoomList();

  broadcastToAll(room, {
    type: S2C.PHASE_CHANGED,
    phase: "play",
    tick: 0,
    running: true,
  });

  // Send initial tick (tick 0)
  const c = countLive(room.alive, room.owner, TOTAL);
  broadcastToAll(room, {
    type: S2C.PLAY_TICK,
    tick: 0,
    alive: Array.from(room.alive),
    owner: Array.from(room.owner),
    p1Live: c.p1,
    p2Live: c.p2,
  });

  if (updateHistoryAndCheckLoop(room)) {
    endSimulation(room, c);
    return;
  }

  if (c.p1 === 0 || c.p2 === 0) {
    endSimulation(room, c);
    return;
  }

  // Clear any existing interval
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
  }

  room.tickInterval = setInterval(() => {
    if (room.tick >= MAX_TICKS) {
      clearInterval(room.tickInterval);
      room.tickInterval = null;
      return;
    }

    stepLife(room.alive, room.owner, room.nextAlive, room.nextOwner, GRID_W, GRID_H);
    room.alive.set(room.nextAlive);
    room.owner.set(room.nextOwner);
    room.tick++;

    const counts = countLive(room.alive, room.owner, TOTAL);

    if (updateHistoryAndCheckLoop(room) || counts.p1 === 0 || counts.p2 === 0 || room.tick >= MAX_TICKS) {
      endSimulation(room, counts);
    } else {
      broadcastToAll(room, {
        type: S2C.PLAY_TICK,
        tick: room.tick,
        alive: Array.from(room.alive),
        owner: Array.from(room.owner),
        p1Live: counts.p1,
        p2Live: counts.p2,
      });
    }
  }, TICK_MS);
}

function endSimulation(room, counts) {
  room.phase = PHASE.DONE;
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }

  if (DEBUG_SYNC) {
    console.log(`[phase] done tick=${room.tick}`);
  }

  broadcastToAll(room, {
    type: S2C.PLAY_END,
    tick: room.tick,
    alive: Array.from(room.alive),
    owner: Array.from(room.owner),
    p1Live: counts.p1,
    p2Live: counts.p2,
    winner: getWinner(counts.p1, counts.p2),
  });
  broadcastRoomList();

  const seedAlive = room.seedAlive ?? room.alive;
  const seedOwner = room.seedOwner ?? room.owner;
  const modeId = "classic_tick100";

  const seedCellsForRole = (role) => {
    const cells = [];
    for (let i = 0; i < TOTAL; i++) {
      if (seedAlive[i] && seedOwner[i] === role) {
        const x = i % GRID_W;
        const y = Math.floor(i / GRID_W);
        cells.push({ x, y });
      }
    }
    return cells;
  };

  const entries = [
    {
      role: 0,
      clientId: room.playerClientIds[0],
      name: room.playerNames[0],
      score: counts.p1,
      color: "P1",
    },
    {
      role: 1,
      clientId: room.playerClientIds[1],
      name: room.playerNames[1],
      score: counts.p2,
      color: "P2",
    },
  ];

  for (const e of entries) {
    if (!e.clientId) continue;
    const seedCells = seedCellsForRole(e.role);
    upsertLeaderboardEntry({
      clientId: e.clientId,
      name: e.name || "Unknown",
      score: e.score,
      seedCells,
      modeId,
      lastRoomId: String(room.id),
      color: e.color,
    }).catch((err) => {
      console.error("Leaderboard upsert failed:", err);
    });
  }
}

function resetRoom(room) {
  if (room.tickInterval) {
    clearInterval(room.tickInterval);
    room.tickInterval = null;
  }
  room.phase = PHASE.SEED;
  room.tick = 0;
  room.ready = [false, false];
  room.playAgainReady = [false, false];
  room.seedVersion = 0;
  room.alive.fill(0);
  room.owner.fill(-1);
  room.seedAlive = null;
  room.seedOwner = null;
  room.hashHistory = [];
  room.loopStreak = 0;
}

// --- Helpers ---

function getPlayerRole(room, ws) {
  for (let i = 0; i < 2; i++) {
    if (room.playerWs[i] === ws) return i;
  }
  return -1; // spectator or not in room
}

function broadcastToAll(room, msg) {
  const data = JSON.stringify(msg);
  for (const ws of room.playerWs) {
    if (ws && ws.readyState === 1) ws.send(data);
  }
  for (const ws of room.spectators) {
    if (ws.readyState === 1) ws.send(data);
  }
}

function sendSeedDeltaRejected(room, ws, reason) {
  if (DEBUG_SYNC) {
    console.log(`[seed] reject v=${room.seedVersion} reason=${reason} client=${ws.clientId}`);
  }
  ws.send(JSON.stringify({
    type: S2C.SEED_DELTA_REJECTED,
    seedVersion: room.seedVersion,
    reason,
  }));
}

function rejectAndResync(room, ws, reason) {
  sendSeedDeltaRejected(room, ws, reason);
  sendSeedState(room, ws);
  return;
}

function computeBoardHash(alive, owner, total) {
  let h = 2166136261;
  for (let i = 0; i < total; i++) {
    const v = alive[i] ? (owner[i] + 2) : 0;
    h ^= v;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function updateHistoryAndCheckLoop(room) {
  const hash = computeBoardHash(room.alive, room.owner, TOTAL);
  room.hashHistory.push(hash);
  if (room.hashHistory.length > LOOP_HISTORY) {
    room.hashHistory.shift();
  }
  let matches = 0;
  for (const h of room.hashHistory) {
    if (h === hash) matches++;
  }
  if (matches >= 2) {
    room.loopStreak += 1;
  } else {
    room.loopStreak = 0;
  }
  return room.loopStreak >= LOOP_STREAK_REQUIRED;
}
