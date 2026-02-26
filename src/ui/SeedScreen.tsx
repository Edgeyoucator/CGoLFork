import { useState, useCallback, useEffect, useRef } from "react";
import { GRID_W, GRID_H, DEFAULT_BUDGET, countCells, clearBoard } from "../game/types";
import type { BoardState } from "../game/types";
import type { RoomState } from "../net/protocol.ts";
import type { GameSocket } from "../net/socket.ts";
import LifeCanvas from "../canvas/LifeCanvas";

interface Props {
  board: BoardState;
  players: [string, string];
  onBack: () => void;
  // Local mode
  onAutoStart?: () => void;
  onClearAll?: () => void;
  // Networked mode
  myRole?: number | "spectator";
  roomState?: RoomState | null;
  socket?: GameSocket | null;
  seedVersion?: number;
  seedSyncKey?: number;
  getSeedVersion?: () => number;
  seedReject?: { id: number; reason: string } | null;
  aiMode?: boolean;
}

const PLAYER_COLORS = ["var(--orange)", "var(--mint)"];
const ROLE_LABELS = ["P1", "P2", "Spectator"];

export default function SeedScreen({
  board,
  players,
  onBack,
  onAutoStart,
  onClearAll,
  myRole,
  roomState,
  socket,
  seedVersion,
  seedSyncKey,
  getSeedVersion,
  seedReject,
  aiMode = false,
}: Props) {
  const networked = myRole !== undefined && socket !== null && socket !== undefined;
  const isSpectator = myRole === "spectator";
  const playerRole = typeof myRole === "number" ? myRole : -1;

  const [activePlayer, setActivePlayer] = useState(networked ? (playerRole >= 0 ? playerRole : 0) : 0);
  const [counts, setCounts] = useState<[number, number]>(() => countCells(board));
  const redrawRef = useRef<(() => void) | null>(null);

  // Local-only ready state
  const [localReady, setLocalReady] = useState<[boolean, boolean]>(aiMode ? [false, true] : [false, false]);
  const autoStartedRef = useRef(false);

  const ready: [boolean, boolean] = networked && roomState
    ? roomState.ready
    : localReady;

  const unreadyBoth = useCallback(() => {
    if (!networked) {
      setLocalReady(aiMode ? [false, true] : [false, false]);
      autoStartedRef.current = false;
    }
  }, [networked, aiMode]);

  const recount = useCallback(() => {
    setCounts(countCells(board));
  }, [board]);

  // Collect deltas during a paint gesture and send as batch
  const pendingDeltasRef = useRef<{ i: number; alive: 0 | 1 }[]>([]);
  const flushTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track board changes for delta computation
  const lastSentRef = useRef<{ alive: Uint8Array; owner: Int8Array } | null>(null);
  const inflightRef = useRef(false);
  const pendingReadyRef = useRef(false);
  const inflightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAttemptedRef = useRef<{ i: number; alive: 0 | 1 }[]>([]);

  const sendPendingDeltas = useCallback(() => {
    if (inflightRef.current || !socket) return false;
    if (pendingDeltasRef.current.length === 0) return false;

    const pending = pendingDeltasRef.current;
    pendingDeltasRef.current = [];

    const merged = new Map<number, 0 | 1>();
    for (const c of pending) merged.set(c.i, c.alive);
    const batched = Array.from(merged.entries()).map(([i, alive]) => ({ i, alive }));
    const baseSeedVersion = getSeedVersion ? getSeedVersion() : (typeof seedVersion === "number" ? seedVersion : 0);
    inflightRef.current = true;
    lastAttemptedRef.current = batched;
    socket.sendSeedDelta(batched, baseSeedVersion);

    // Safety timeout: if no sync arrives, release inflight to avoid deadlock
    if (inflightTimeoutRef.current) {
      clearTimeout(inflightTimeoutRef.current);
    }
    inflightTimeoutRef.current = setTimeout(() => {
      inflightRef.current = false;
      inflightTimeoutRef.current = null;
      if (pendingDeltasRef.current.length > 0) {
        sendPendingDeltas();
      } else if (pendingReadyRef.current) {
        pendingReadyRef.current = false;
        socket?.sendReady(true);
      }
    }, 600);

    // Update last sent snapshot
    lastSentRef.current = {
      alive: new Uint8Array(board.alive),
      owner: new Int8Array(board.owner),
    };
    return true;
  }, [socket, seedVersion, board.alive, board.owner]);

  // Override handlePaint to use proper delta tracking
  const handlePaintWithDelta = useCallback(() => {
    recount();
    if (networked && !isSpectator && playerRole >= 0) {
      // Compare current board to last sent state in our territory
      const total = GRID_W * GRID_H;
      const changes: { i: number; alive: 0 | 1 }[] = [];
      const last = lastSentRef.current;

      for (let i = 0; i < total; i++) {
        const x = i % GRID_W;
        const inTerritory = playerRole === 0 ? x < GRID_W / 2 : x >= GRID_W / 2;
        if (!inTerritory) continue;

        const wasAlive = last ? last.alive[i] : 0;
        const wasOwn = last ? last.owner[i] === playerRole : false;
        const isAlive = board.alive[i] === 1;
        const isOwn = board.owner[i] === playerRole;

        if (isAlive && isOwn && !(wasAlive && wasOwn)) {
          changes.push({ i, alive: 1 });
        } else if (wasAlive && wasOwn && !(isAlive && isOwn)) {
          changes.push({ i, alive: 0 });
        }
      }

      if (changes.length > 0) {
        // Coalesce changes until we can send (avoid out-of-sync rejects)
        for (const c of changes) {
          pendingDeltasRef.current.push(c);
        }
        if (!flushTimeoutRef.current) {
          flushTimeoutRef.current = setTimeout(() => {
            flushTimeoutRef.current = null;
            if (!sendPendingDeltas()) {
              // If still inflight, try again shortly
              if (inflightRef.current) {
                flushTimeoutRef.current = setTimeout(() => {
                  flushTimeoutRef.current = null;
                  sendPendingDeltas();
                }, 30);
              }
            }
          }, 30);
        }
      }
    } else if (!networked) {
      unreadyBoth();
    }
  }, [board, networked, isSpectator, playerRole, recount, unreadyBoth, seedVersion, sendPendingDeltas]);

  // Initialize last sent snapshot
  useEffect(() => {
    if (networked) {
      lastSentRef.current = {
        alive: new Uint8Array(board.alive),
        owner: new Int8Array(board.owner),
      };
    }
  }, [networked, board]);

  // Update last sent when seed state arrives from server
  useEffect(() => {
    if (networked) {
      lastSentRef.current = {
        alive: new Uint8Array(board.alive),
        owner: new Int8Array(board.owner),
      };
      inflightRef.current = false;
      if (inflightTimeoutRef.current) {
        clearTimeout(inflightTimeoutRef.current);
        inflightTimeoutRef.current = null;
      }
      // If we were waiting to send or to ready, do it now
      if (pendingDeltasRef.current.length > 0) {
        sendPendingDeltas();
      } else if (pendingReadyRef.current) {
        pendingReadyRef.current = false;
        socket?.sendReady(true);
      }
      recount();
      redrawRef.current?.();
    }
  }, [networked, seedVersion, seedSyncKey, recount, board.alive, board.owner, sendPendingDeltas, socket]);

  useEffect(() => {
    if (!networked || !seedReject) return;
    inflightRef.current = false;
    if (inflightTimeoutRef.current) {
      clearTimeout(inflightTimeoutRef.current);
      inflightTimeoutRef.current = null;
    }

    if (seedReject.reason === "outOfSync") {
      // Requeue the last attempted batch and retry on the latest seedVersion
      pendingDeltasRef.current = [
        ...lastAttemptedRef.current,
        ...pendingDeltasRef.current,
      ];
      sendPendingDeltas();
    } else {
      // Other rejects should not be retried
      lastAttemptedRef.current = [];
      pendingReadyRef.current = false;
    }
  }, [networked, seedReject, sendPendingDeltas]);

  const getBudgetRemaining = useCallback(() => {
    return DEFAULT_BUDGET - counts[activePlayer];
  }, [counts, activePlayer]);

  const handleClear = useCallback(() => {
    if (networked) {
      pendingDeltasRef.current = [];
      pendingReadyRef.current = false;
      inflightRef.current = false;
      if (inflightTimeoutRef.current) {
        clearTimeout(inflightTimeoutRef.current);
        inflightTimeoutRef.current = null;
      }
      socket!.sendClearSeed();
    } else {
      if (aiMode) {
        onClearAll?.();
        setCounts(countCells(board));
        redrawRef.current?.();
        unreadyBoth();
      } else {
        clearBoard(board);
        setCounts([0, 0]);
        redrawRef.current?.();
        unreadyBoth();
        onClearAll?.();
      }
    }
  }, [board, networked, socket, unreadyBoth, onClearAll, aiMode]);

  const toggleReady = useCallback(
    (player: 0 | 1) => {
      if (networked) {
        if (player !== playerRole) return;
        const currentReady = roomState?.ready[playerRole] ?? false;
        const nextReady = !currentReady;
        if (nextReady) {
          // Ensure all pending deltas are sent before ready
          if (inflightRef.current || pendingDeltasRef.current.length > 0) {
            pendingReadyRef.current = true;
            sendPendingDeltas();
            return;
          }
        } else {
          pendingReadyRef.current = false;
        }
        socket!.sendReady(nextReady);
      } else {
        setLocalReady((prev) => {
          const next: [boolean, boolean] = [...prev];
          next[player] = !next[player];
          return next;
        });
      }
    },
    [networked, playerRole, roomState, socket, sendPendingDeltas],
  );

  // Local auto-start
  useEffect(() => {
    if (networked) return;
    const aiReady = aiMode ? true : localReady[1];
    if (localReady[0] && aiReady && !autoStartedRef.current) {
      autoStartedRef.current = true;
      onAutoStart?.();
    }
  }, [localReady, onAutoStart, networked, aiMode]);

  // Expose a way for App to bump version (seed state from server)
  // This is done via key prop on SeedScreen

  const roleLabel = isSpectator
    ? "Spectator"
    : networked
      ? `You are ${ROLE_LABELS[playerRole]}`
      : null;

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 12,
      }}
    >
      {/* HUD */}
      <div
        className="glass"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 24 }}>
          <span>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 3,
                background: "var(--orange)",
                marginRight: 6,
              }}
            />
            {players[0]}: {counts[0]}/{DEFAULT_BUDGET}
            <span
              style={{
                marginLeft: 8,
                fontSize: "0.85em",
                color: ready[0] ? "var(--mint)" : "rgba(255,255,255,0.4)",
              }}
            >
              {ready[0] ? "Ready" : "Not Ready"}
            </span>
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: 12,
                height: 12,
                borderRadius: 3,
                background: "var(--mint)",
                marginRight: 6,
              }}
            />
            {players[1]}: {counts[1]}/{DEFAULT_BUDGET}
            <span
              style={{
                marginLeft: 8,
                fontSize: "0.85em",
                color: ready[1] ? "var(--mint)" : "rgba(255,255,255,0.4)",
              }}
            >
              {ready[1] ? "Ready" : "Not Ready"}
            </span>
          </span>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {roleLabel && (
            <span
              style={{
                fontSize: "0.85em",
                color: isSpectator ? "var(--grey)" : PLAYER_COLORS[playerRole],
                fontWeight: "bold",
              }}
            >
              {roleLabel}
            </span>
          )}
          {!isSpectator && (
            <span
              style={{
                fontWeight: "bold",
                color: PLAYER_COLORS[activePlayer],
              }}
            >
              Painting as: {players[activePlayer]}
            </span>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <LifeCanvas
        board={board}
        activePlayer={activePlayer}
        onPaint={handlePaintWithDelta}
        getBudgetRemaining={getBudgetRemaining}
        showTerritories
        interactive={!isSpectator}
        redrawRef={redrawRef}
      />

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <button className="btn" onClick={onBack}>
          {networked ? "Leave Room" : "Back to Lobby"}
        </button>

        {!networked && !aiMode && (
          <button
            className="btn"
            onClick={() => setActivePlayer((p) => (p === 0 ? 1 : 0))}
            style={{ borderColor: PLAYER_COLORS[activePlayer] }}
          >
            Switch to {players[activePlayer === 0 ? 1 : 0]}
          </button>
        )}

        {!isSpectator && (
          <button className="btn" onClick={handleClear}>
            Clear {networked ? "My Cells" : "All"}
          </button>
        )}

        {networked && !isSpectator ? (
          <button
            className="btn"
            onClick={() => toggleReady(playerRole as 0 | 1)}
            style={{
              borderColor: ready[playerRole] ? PLAYER_COLORS[playerRole] : undefined,
              background: ready[playerRole]
                ? playerRole === 0
                  ? "rgba(241,95,36,0.2)"
                  : "rgba(134,218,189,0.2)"
                : undefined,
            }}
          >
            {ready[playerRole] ? "Unready" : "Ready"}
          </button>
        ) : !networked ? (
          <>
            <button
              className="btn"
              onClick={() => toggleReady(0)}
              style={{
                borderColor: ready[0] ? "var(--orange)" : undefined,
                background: ready[0] ? "rgba(241,95,36,0.2)" : undefined,
              }}
            >
              {aiMode ? (ready[0] ? "Unready" : "Play") : `P1: ${ready[0] ? "Unready" : "Ready"}`}
            </button>
            {aiMode ? null : (
              <button
                className="btn"
                onClick={() => toggleReady(1)}
                style={{
                  borderColor: ready[1] ? "var(--mint)" : undefined,
                  background: ready[1] ? "rgba(134,218,189,0.2)" : undefined,
                }}
              >
                P2: {ready[1] ? "Unready" : "Ready"}
              </button>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
