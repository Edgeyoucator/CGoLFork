import { useState, useCallback, useRef, useEffect } from "react";
import { GRID_W, GRID_H } from "../game/types";
import type { BoardState } from "../game/types";
import { stepLife, countLiveByPlayer } from "../game/engine";
import type { GameMode } from "../game/modes";
import type { GameSocket } from "../net/socket.ts";
import type { RoomState } from "../net/protocol.ts";
import LifeCanvas from "../canvas/LifeCanvas";
import LeaderboardModal from "./LeaderboardModal";

const TICK_RATE = 12;
const TICK_MS = 1000 / TICK_RATE;
const LOOP_HISTORY = 6;
const LOOP_STREAK_REQUIRED = 15;

interface Props {
  board: BoardState;
  players: [string, string];
  mode: GameMode;
  hasSnapshot: boolean;
  onPlayAgain: () => void;
  onReplay: () => void;
  onReset: () => void;
  // Networked mode
  networked?: boolean;
  myRole?: number | "spectator";
  roomState?: RoomState | null;
  aiMode?: boolean;
  netTick?: number;
  netCounts?: [number, number];
  netFinished?: boolean;
  netWinner?: string | null;
  socket?: GameSocket | null;
}

const ROLE_LABELS = ["P1", "P2", "Spectator"];

export default function PlayScreen({
  board,
  players,
  mode,
  hasSnapshot,
  onPlayAgain,
  onReplay,
  onReset,
  networked = false,
  myRole,
  roomState,
  aiMode = false,
  netTick,
  netCounts,
  netFinished,
  netWinner,
  socket,
}: Props) {
  const total = GRID_W * GRID_H;
  const isSpectator = myRole === "spectator";
  const isPlayer = networked && typeof myRole === "number";

  const [localTick, setLocalTick] = useState(0);
  const [localPlaying, setLocalPlaying] = useState(!networked);
  const [localCounts, setLocalCounts] = useState(() => {
    const c = countLiveByPlayer(board.alive, board.owner, total);
    return [c.p1, c.p2] as [number, number];
  });
  const [localFinished, setLocalFinished] = useState(false);
  const [redrawKey, setRedrawKey] = useState(0);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  const tick = networked ? (netTick ?? 0) : localTick;
  const counts = networked ? (netCounts ?? [0, 0]) : localCounts;
  const finished = networked ? (netFinished ?? false) : localFinished;

  const nextAliveRef = useRef(new Uint8Array(total));
  const nextOwnerRef = useRef(new Int8Array(total));
  const redrawRef = useRef<(() => void) | null>(null);
  const tickRef = useRef(localTick);
  tickRef.current = localTick;
  const hashHistoryRef = useRef<number[]>([]);
  const loopStreakRef = useRef(0);

  const computeBoardHash = useCallback((alive: Uint8Array, owner: Int8Array) => {
    let h = 2166136261;
    for (let i = 0; i < total; i++) {
      const v = alive[i] ? (owner[i] + 2) : 0;
      h ^= v;
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }, [total]);

  const updateHistoryAndCheckLoop = useCallback((alive: Uint8Array, owner: Int8Array) => {
    const hash = computeBoardHash(alive, owner);
    const history = hashHistoryRef.current;
    history.push(hash);
    if (history.length > LOOP_HISTORY) history.shift();
    let matches = 0;
    for (const h of history) {
      if (h === hash) matches++;
    }
    if (matches >= 2) {
      loopStreakRef.current += 1;
    } else {
      loopStreakRef.current = 0;
    }
    return loopStreakRef.current >= LOOP_STREAK_REQUIRED;
  }, [computeBoardHash]);

  useEffect(() => {
    if (networked) {
      redrawRef.current?.();
    }
  }, [networked, netTick]);

  const doStep = useCallback(() => {
    if (networked) return;
    if (tickRef.current >= mode.maxTicks) return;

    stepLife(board.alive, board.owner, nextAliveRef.current, nextOwnerRef.current, GRID_W, GRID_H);
    board.alive.set(nextAliveRef.current);
    board.owner.set(nextOwnerRef.current);

    const newTick = tickRef.current + 1;
    const c = countLiveByPlayer(board.alive, board.owner, total);
    setLocalCounts([c.p1, c.p2]);
    setLocalTick(newTick);
    redrawRef.current?.();

    if (updateHistoryAndCheckLoop(board.alive, board.owner) || c.p1 === 0 || c.p2 === 0 || newTick >= mode.maxTicks) {
      setLocalPlaying(false);
      setLocalFinished(true);
    }
  }, [board, total, mode.maxTicks, networked, updateHistoryAndCheckLoop]);

  useEffect(() => {
    if (networked) return;
    hashHistoryRef.current = [];
    loopStreakRef.current = 0;
    updateHistoryAndCheckLoop(board.alive, board.owner);
    if (!localPlaying) return;
    if (localCounts[0] === 0 || localCounts[1] === 0) {
      setLocalPlaying(false);
      setLocalFinished(true);
      return;
    }
    const id = setInterval(doStep, TICK_MS);
    return () => clearInterval(id);
  }, [localPlaying, doStep, networked, localCounts, board.alive, board.owner, updateHistoryAndCheckLoop]);

  const handleStep = useCallback(() => {
    if (networked || finished) return;
    doStep();
  }, [doStep, finished, networked]);

  const handlePlayPause = useCallback(() => {
    if (networked || finished) return;
    setLocalPlaying((p) => !p);
  }, [finished, networked]);

  const handlePlayAgain = useCallback(() => {
    setLocalPlaying(false);
    setLocalFinished(false);
    setLocalTick(0);
    onPlayAgain();
  }, [onPlayAgain]);

  const handleReplay = useCallback(() => {
    if (networked && socket) {
      socket.sendWatchReplay();
      return;
    }
    onReplay();
    setLocalTick(0);
    setLocalFinished(false);
    setLocalCounts(() => {
      const c = countLiveByPlayer(board.alive, board.owner, total);
      return [c.p1, c.p2];
    });
    setRedrawKey((v) => v + 1);
    setTimeout(() => setLocalPlaying(true), 0);
  }, [networked, socket, onReplay, board, total]);

  let winner: string | null = null;
  if (finished) {
    if (networked) {
      winner = netWinner ?? null;
    } else {
      winner = mode.getWinner({ p1Live: counts[0], p2Live: counts[1], tick });
    }
  }
  const winnerName =
    winner === "P1" ? players[0] : winner === "P2" ? players[1] : null;

  const roleLabel = isSpectator
    ? "Spectator"
    : isPlayer
      ? `You are ${ROLE_LABELS[myRole as number]}`
      : null;

  const playAgainReady: [boolean, boolean] = roomState?.playAgainReady ?? [false, false];
  const isWaitingForOther = isPlayer
    ? (myRole === 0 ? playAgainReady[0] : playAgainReady[1]) && !(playAgainReady[0] && playAgainReady[1])
    : false;

  const handlePlayAgainNetworked = useCallback(() => {
    if (!networked || !socket || !isPlayer) return;
    const current = myRole === 0 ? playAgainReady[0] : playAgainReady[1];
    socket.sendPlayAgain(!current);
  }, [networked, socket, isPlayer, myRole, playAgainReady]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: 16,
        gap: 12,
        position: "relative",
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
            {players[0]}: {counts[0]}
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
            {players[1]}: {counts[1]}
          </span>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {roleLabel && (
            <span style={{ fontSize: "0.85em", color: "var(--grey)" }}>
              {roleLabel}
            </span>
          )}
          <span style={{ fontWeight: "bold", color: "var(--blue)" }}>
            Tick: {tick} / {mode.maxTicks}
          </span>
        </div>
      </div>

      {/* Canvas */}
      <LifeCanvas
        key={redrawKey}
        board={board}
        interactive={false}
        redrawRef={redrawRef}
      />

      {/* Controls */}
      {!networked && (
        <div
          style={{
            display: "flex",
            gap: 12,
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn"
            onClick={handlePlayPause}
            style={{ minWidth: 90 }}
            disabled={finished}
          >
            {localPlaying ? "Pause" : "Play"}
          </button>
          <button className="btn" onClick={handleStep} disabled={finished}>
            Step
          </button>
          {!aiMode && (
            <button className="btn" onClick={onReset}>
              Reset
            </button>
          )}
        </div>
      )}

      {/* Result overlay */}
      {finished && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(22,34,55,0.7)",
            zIndex: 10,
          }}
        >
          <div
            className="glass"
            style={{
              padding: "40px 48px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              minWidth: 320,
            }}
          >
            <h2 style={{ fontSize: "1.6rem", margin: 0 }}>
              {winner === "Draw" ? "It's a Draw!" : `${winnerName} Wins!`}
            </h2>

            <div style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.5)" }}>
              {mode.name}
            </div>

            <div style={{ display: "flex", gap: 24, fontSize: "1.1rem" }}>
              <span style={{ color: "var(--orange)" }}>
                {players[0]}: {counts[0]}
              </span>
              <span style={{ color: "var(--mint)" }}>
                {players[1]}: {counts[1]}
              </span>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {networked ? (
                <>
                  {!isSpectator && (
                    <button className="btn" onClick={handleReplay}>
                      Watch Replay
                    </button>
                  )}
                  {isPlayer && (
                    <button className="btn" onClick={handlePlayAgainNetworked}>
                      {isWaitingForOther ? "Waiting for other player..." : "Play Again"}
                    </button>
                  )}
                  {!aiMode && (
                    <button className="btn" onClick={() => setLeaderboardOpen(true)}>
                      See Leaderboard
                    </button>
                  )}
                  <button className="btn" onClick={onReset}>
                    Leave Room
                  </button>
                </>
              ) : (
                <>
                  <button className="btn" onClick={handlePlayAgain}>
                    Play Again
                  </button>
                  <button
                    className="btn"
                    onClick={handleReplay}
                    disabled={!hasSnapshot}
                  >
                    Watch Replay
                  </button>
                  {!aiMode && (
                    <button className="btn" onClick={() => setLeaderboardOpen(true)}>
                      See Leaderboard
                    </button>
                  )}
                  {!aiMode && (
                    <button className="btn" onClick={onReset}>
                      Reset
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {!aiMode && (
        <LeaderboardModal open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      )}
    </div>
  );
}
