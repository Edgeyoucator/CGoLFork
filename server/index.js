import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import http from "node:http";
import { WebSocketServer } from "ws";
import { C2S, S2C } from "./protocol.js";
import {
  getRoomList,
  joinRoom,
  leaveRoom,
  handleDisconnect,
  handleSeedDelta,
  handleClearSeed,
  handleSetReady,
  handlePlayAgain,
  handleWatchReplay,
  registerClient,
  unregisterClient,
  broadcastRoomList,
} from "./rooms.js";
import { getDb } from "./firebaseAdmin.js";

const PORT = Number(process.env.PORT) || 3001;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  res.statusCode = 200;
  res.setHeader("Content-Type", "text/plain");
  res.end("Conway Duel server");
});

const wss = new WebSocketServer({ server });

server.listen(PORT, () => {
  console.log(`Conway Duel server listening on PORT=${PORT}`);
  // Trigger Firebase Admin init (if configured) and log status
  const db = getDb();
  if (db) {
    console.log("Firebase Admin initialised");
  } else {
    console.log("Firebase Admin not configured; leaderboard writes disabled.");
  }
});

wss.on("connection", (ws) => {
  ws.playerName = null;
  ws.clientId = null;
  ws.currentRoom = null;

  registerClient(ws);

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.type) {
      case C2S.HELLO: {
        ws.playerName = (msg.name || "Unknown").slice(0, 20);
        ws.clientId = msg.clientId || null;
        ws.send(JSON.stringify({ type: S2C.WELCOME, clientId: ws.clientId }));
        break;
      }

      case C2S.LIST_ROOMS: {
        ws.send(JSON.stringify({ type: S2C.ROOM_LIST, rooms: getRoomList() }));
        break;
      }

      case C2S.JOIN_ROOM: {
        if (ws.currentRoom !== null) {
          leaveRoom(ws.currentRoom, ws);
        }

        if (!ws.clientId) {
          ws.send(JSON.stringify({ type: S2C.ERROR, message: "Missing clientId; reconnect and try again." }));
          break;
        }

        const result = joinRoom(msg.roomId, ws, !!msg.spectate);
        if (result.error) {
          ws.send(JSON.stringify({ type: S2C.ERROR, message: result.error }));
        } else {
          ws.currentRoom = msg.roomId;
          ws.send(
            JSON.stringify({
              type: S2C.ROOM_JOINED,
              roomId: msg.roomId,
              role: result.role,
              roomState: result.roomState,
            })
          );
        }
        broadcastRoomList();
        break;
      }

      case C2S.LEAVE_ROOM: {
        if (ws.currentRoom !== null) {
          leaveRoom(ws.currentRoom, ws);
          ws.currentRoom = null;
          broadcastRoomList();
        }
        break;
      }

      case C2S.SEED_DELTA: {
        if (ws.currentRoom !== null && Array.isArray(msg.changes)) {
          const baseSeedVersion = Number.isFinite(msg.baseSeedVersion) ? msg.baseSeedVersion : -1;
          handleSeedDelta(ws.currentRoom, ws, baseSeedVersion, msg.changes);
          broadcastRoomList();
        }
        break;
      }

      case C2S.CLEAR_SEED: {
        if (ws.currentRoom !== null) {
          handleClearSeed(ws.currentRoom, ws);
          broadcastRoomList();
        }
        break;
      }

      case C2S.SET_READY: {
        if (ws.currentRoom !== null) {
          handleSetReady(ws.currentRoom, ws, msg.ready);
          broadcastRoomList();
        }
        break;
      }

      case C2S.PLAY_AGAIN: {
        if (ws.currentRoom !== null) {
          handlePlayAgain(ws.currentRoom, ws, msg.ready);
          broadcastRoomList();
        }
        break;
      }

      case C2S.WATCH_REPLAY: {
        if (ws.currentRoom !== null) {
          handleWatchReplay(ws.currentRoom, ws);
        }
        break;
      }
    }
  });

  ws.on("close", () => {
    if (ws.currentRoom !== null) {
      // Disconnect (not leave) — preserves slot for reconnect
      handleDisconnect(ws.currentRoom, ws);
      broadcastRoomList();
    }
    unregisterClient(ws);
  });
});
