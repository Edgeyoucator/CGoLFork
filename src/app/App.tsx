import { useState, useRef, useCallback, useEffect } from "react";
import { createBoard, clearBoard, snapshotBoard, restoreBoard, GRID_W, GRID_H } from "../game/types";
import type { Screen, BoardState, SeedSnapshot } from "../game/types";
import { defaultMode } from "../game/modes";
import type { RoomInfo, RoomState, SeedDeltaChange } from "../net/protocol.ts";
import { GameSocket } from "../net/socket.ts";
import { seedAI } from "../ai/seedAI";
import Lobby from "../ui/Lobby";
import ModeSelect from "../ui/ModeSelect";
import Rooms from "../ui/Rooms";
import SeedScreen from "../ui/SeedScreen";
import PlayScreen from "../ui/PlayScreen";

const WS_URL =
  (import.meta as any)?.env?.VITE_WS_URL ||
  (window.location.protocol === "https:"
    ? `wss://${window.location.hostname}`
    : `ws://${window.location.hostname || "localhost"}:3001`);
const DEBUG_SYNC = false;

export default function App() {
  const [screen, setScreen] = useState<Screen>("lobby");
  const [playerName, setPlayerName] = useState("Player");
  const [players, setPlayers] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [localMode, setLocalMode] = useState<"none" | "ai">("none");
  const boardRef = useRef<BoardState>(createBoard());
  const snapshotRef = useRef<SeedSnapshot | null>(null);
  const aiMatchSeedRef = useRef(0);

  const socketRef = useRef<GameSocket | null>(null);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [myRole, setMyRole] = useState<number | "spectator" | null>(null);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [connected, setConnected] = useState(false);
  const [seedRenderKey, setSeedRenderKey] = useState(0);
  const [seedVersion, setSeedVersion] = useState(0);
  const [seedReject, setSeedReject] = useState<{ id: number; reason: string } | null>(null);
  const seedRejectIdRef = useRef(0);
  const seedVersionRef = useRef(0);

  const [netTick, setNetTick] = useState(0);
  const [netCounts, setNetCounts] = useState<[number, number]>([0, 0]);
  const [netFinished, setNetFinished] = useState(false);
  const [netWinner, setNetWinner] = useState<string | null>(null);

  const screenRef = useRef(screen);
  screenRef.current = screen;

  useEffect(() => {
    seedVersionRef.current = seedVersion;
  }, [seedVersion]);

  function updatePlayersFromRoomState(rs: RoomState) {
    const p1 = rs.players[0]?.name ?? "Player 1";
    const p2 = rs.players[1]?.name ?? "Player 2";
    setPlayers([p1, p2]);
  }

  function applyFullBoard(alive: number[], owner: number[]) {
    const board = boardRef.current;
    for (let i = 0; i < alive.length; i++) {
      board.alive[i] = alive[i];
      board.owner[i] = owner[i];
    }
  }

  function applySeedDelta(changes: SeedDeltaChange[]) {
    const board = boardRef.current;
    for (const c of changes) {
      board.alive[c.i] = c.alive;
      board.owner[c.i] = c.owner;
    }
  }

  const setupCallbacks = useCallback((sock: GameSocket) => {
    sock.setCallbacks({
      onOpen: () => {
        setConnected(true);
        sock.requestRooms();
      },
      onClose: () => {
        setConnected(false);
      },
      onRoomList: (roomList) => setRooms(roomList),
      onRoomJoined: (_roomId, role, rs) => {
        setMyRole(role);
        setRoomState(rs);
        updatePlayersFromRoomState(rs);
        setSeedVersion(0);
        setSeedRenderKey((v) => v + 1);
        setScreen("seed");
      },
      onRoomState: (rs) => {
        setRoomState(rs);
        updatePlayersFromRoomState(rs);
        if (rs.phase === "play" && screenRef.current !== "play") {
          setNetTick(0);
          setNetFinished(false);
          setNetWinner(null);
          setScreen("play");
        }
        // If phase went back to seed (e.g. after replay ends and resets)
        if (rs.phase === "seed" && screenRef.current === "play") {
          setScreen("seed");
        }
      },
      onSeedState: (serverSeedVersion, alive, owner) => {
        applyFullBoard(alive, owner);
        setSeedVersion(serverSeedVersion);
        setSeedRenderKey((v) => v + 1);
      },
      onSeedDeltaApplied: (serverSeedVersion, changes) => {
        if (serverSeedVersion > seedVersionRef.current) {
          applySeedDelta(changes);
          setSeedVersion(serverSeedVersion);
          setSeedRenderKey((v) => v + 1);
        } else {
          if (DEBUG_SYNC) {
            console.warn("Seed delta out of sequence", { local: seedVersionRef.current, server: serverSeedVersion });
          }
        }
      },
      onSeedDeltaRejected: (payload) => {
        if (DEBUG_SYNC) {
          console.warn("Seed delta rejected", payload);
        }
        seedRejectIdRef.current += 1;
        setSeedReject({ id: seedRejectIdRef.current, reason: payload.reason });
      },
      onPhaseChanged: (phase, tick, running) => {
        if (DEBUG_SYNC) {
          console.log("Phase changed", { phase, tick, running });
        }
      },
      onPlayTick: (tick, alive, owner, p1Live, p2Live) => {
        applyFullBoard(alive, owner);
        setNetTick(tick);
        setNetCounts([p1Live, p2Live]);
        // If we were finished (replay case), clear finished state
        setNetFinished(false);
      },
      onPlayEnd: (tick, alive, owner, p1Live, p2Live, winner) => {
        applyFullBoard(alive, owner);
        setNetTick(tick);
        setNetCounts([p1Live, p2Live]);
        setNetFinished(true);
        setNetWinner(winner);
      },
      onError: (message) => console.error("Server error:", message),
    });
  }, []);

  const connectSocket = useCallback(
    (name: string) => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const sock = new GameSocket(WS_URL);
      socketRef.current = sock;
      setupCallbacks(sock);
      sock.connect(name);
    },
    [setupCallbacks],
  );

  // Re-setup callbacks when connected changes (reconnect scenario)
  useEffect(() => {
    if (socketRef.current) {
      setupCallbacks(socketRef.current);
    }
  }, [connected, setupCallbacks]);

  const handleRefreshRooms = useCallback(() => {
    socketRef.current?.requestRooms();
  }, []);

  const handleJoinRoom = useCallback((roomId: number, spectate = false) => {
    socketRef.current?.joinRoom(roomId, spectate);
  }, []);

  const handleLeaveRoom = useCallback(() => {
    socketRef.current?.leaveRoom();
    setMyRole(null);
    setRoomState(null);
    setNetFinished(false);
    setNetWinner(null);
    setScreen("rooms");
    socketRef.current?.requestRooms();
  }, []);

  // --- Local mode callbacks ---
  const handleLocalAutoStart = useCallback(() => {
    snapshotRef.current = snapshotBoard(boardRef.current);
    setScreen("play");
  }, []);

  const startAiSeedPhase = useCallback(() => {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1_000_000_000)) >>> 0;
    aiMatchSeedRef.current = seed;
    clearBoard(boardRef.current);
    const indices = seedAI({
      width: GRID_W,
      height: GRID_H,
      budget: 25,
      side: "right",
      rngSeed: aiMatchSeedRef.current,
    });
    for (const i of indices) {
      boardRef.current.alive[i] = 1;
      boardRef.current.owner[i] = 1;
    }
  }, []);

  const handleLocalPlayAgain = useCallback(() => {
    if (localMode === "ai") {
      startAiSeedPhase();
      snapshotRef.current = null;
      setScreen("seed");
      return;
    }
    if (snapshotRef.current) {
      restoreBoard(boardRef.current, snapshotRef.current);
    }
    setScreen("seed");
  }, [localMode, startAiSeedPhase]);

  const handleLocalReplay = useCallback(() => {
    if (snapshotRef.current) {
      restoreBoard(boardRef.current, snapshotRef.current);
    }
  }, []);

  const handleLocalClearAll = useCallback(() => {
    if (localMode === "ai") {
      startAiSeedPhase();
      snapshotRef.current = null;
    } else {
      clearBoard(boardRef.current);
      snapshotRef.current = null;
    }
  }, [localMode, startAiSeedPhase]);

  // --- Render ---
  if (screen === "lobby") {
    return (
      <Lobby
        onContinue={(name) => {
          setPlayerName(name);
          setScreen("mode");
        }}
      />
    );
  }

  if (screen === "mode") {
    return (
      <ModeSelect
        playerName={playerName}
        onOnline={() => {
          setLocalMode("none");
          connectSocket(playerName);
          setScreen("rooms");
        }}
        onAi={() => {
          setLocalMode("ai");
          setPlayers([playerName, "AI"]);
          startAiSeedPhase();
          snapshotRef.current = null;
          setScreen("seed");
        }}
        onBack={() => setScreen("lobby")}
      />
    );
  }

  if (screen === "rooms") {
    return (
      <Rooms
        rooms={rooms}
        onRefresh={handleRefreshRooms}
        onJoin={handleJoinRoom}
        onBack={() => {
          socketRef.current?.disconnect();
          setScreen("lobby");
        }}
        playerName={playerName}
      />
    );
  }

  const isNetworked = myRole !== null && socketRef.current !== null;

  if (screen === "seed") {
    if (isNetworked) {
      return (
        <SeedScreen
          key={seedRenderKey}
          board={boardRef.current}
          players={players}
          onBack={handleLeaveRoom}
          myRole={myRole!}
          roomState={roomState}
          socket={socketRef.current}
          seedVersion={seedVersion}
          seedSyncKey={seedRenderKey}
          getSeedVersion={() => seedVersionRef.current}
          seedReject={seedReject}
        />
      );
    }
    return (
      <SeedScreen
        board={boardRef.current}
        players={players}
        onBack={() => {
          if (localMode === "ai") {
            setScreen("mode");
          } else {
            setScreen("lobby");
          }
        }}
        onAutoStart={handleLocalAutoStart}
        onClearAll={handleLocalClearAll}
        aiMode={localMode === "ai"}
      />
    );
  }

  // Play screen
  if (isNetworked) {
    return (
      <PlayScreen
        board={boardRef.current}
        players={players}
        mode={defaultMode}
        hasSnapshot={false}
        onPlayAgain={handleLeaveRoom}
        onReplay={() => {}}
        onReset={handleLeaveRoom}
        networked
        myRole={myRole!}
        roomState={roomState}
        netTick={netTick}
        netCounts={netCounts}
        netFinished={netFinished}
        netWinner={netWinner}
        socket={socketRef.current}
      />
    );
  }

  return (
    <PlayScreen
      board={boardRef.current}
      players={players}
      mode={defaultMode}
      hasSnapshot={snapshotRef.current !== null}
      onPlayAgain={handleLocalPlayAgain}
      onReplay={handleLocalReplay}
      onReset={() => {
        if (localMode === "ai") {
          startAiSeedPhase();
          snapshotRef.current = null;
          setScreen("seed");
        } else {
          clearBoard(boardRef.current);
          snapshotRef.current = null;
          setScreen("seed");
        }
      }}
      aiMode={localMode === "ai"}
    />
  );
}
