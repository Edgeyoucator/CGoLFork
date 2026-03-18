import { useState, useCallback, useRef, useEffect } from "react";
import { GRID_W, GRID_H } from "../game/types";
import type { BoardState } from "../game/types";
import { stepLife, countLiveByPlayer } from "../game/engine";
import type { GameMode } from "../game/modes";
import LifeCanvas from "../canvas/LifeCanvas";

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
  aiMode?: boolean;
}


export default function PlayScreen({
  board,
  players,
  mode,
  hasSnapshot,
  onPlayAgain,
  onReplay,
  onReset,
  aiMode = false,
}: Props) {
  const total = GRID_W * GRID_H;
  const [localTick, setLocalTick] = useState(0);
  const [localPlaying, setLocalPlaying] = useState(true);
  const [localCounts, setLocalCounts] = useState(() => {
    const c = countLiveByPlayer(board.alive, board.owner, total);
    return [c.p1, c.p2] as [number, number];
  });
  const [localFinished, setLocalFinished] = useState(false);
  const [redrawKey, setRedrawKey] = useState(0);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const tick = localTick;
  const counts = localCounts;
  const finished = localFinished;

  const nextAliveRef = useRef(new Uint8Array(total));
  const nextOwnerRef = useRef(new Int8Array(total));
  const redrawRef = useRef<(() => void) | null>(null);
  const tickRef = useRef(localTick);
  tickRef.current = localTick;
  const hashHistoryRef = useRef<number[]>([]);
  const loopStreakRef = useRef(0);
  const graceTicksRef = useRef<number | null>(null);
  const p1PrevHashRef = useRef<number | null>(null);
  const p1StaticStreakRef = useRef(0);

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
    // local-only: nothing to do
  }, []);

  const doStep = useCallback(() => {
    if (tickRef.current >= mode.maxTicks) return;

    stepLife(board.alive, board.owner, nextAliveRef.current, nextOwnerRef.current, GRID_W, GRID_H);
    board.alive.set(nextAliveRef.current);
    board.owner.set(nextOwnerRef.current);

    const newTick = tickRef.current + 1;
    const c = countLiveByPlayer(board.alive, board.owner, total);
    setLocalCounts([c.p1, c.p2]);
    setLocalTick(newTick);
    redrawRef.current?.();

    const looped = updateHistoryAndCheckLoop(board.alive, board.owner);
    const extinct = c.p1 === 0 || c.p2 === 0;
    const hitMax = newTick >= mode.maxTicks;

    // Detect if P1's cells are completely static
    let p1Hash = 2166136261;
    for (let i = 0; i < total; i++) {
      if (board.alive[i] && board.owner[i] === 0) {
        p1Hash ^= i;
        p1Hash = Math.imul(p1Hash, 16777619);
      }
    }
    p1Hash = p1Hash >>> 0;
    if (p1PrevHashRef.current === p1Hash) {
      p1StaticStreakRef.current += 1;
    } else {
      p1StaticStreakRef.current = 0;
    }
    p1PrevHashRef.current = p1Hash;
    const p1Static = p1StaticStreakRef.current >= 3;

    if (looped || hitMax) {
      graceTicksRef.current = null;
      setLocalPlaying(false);
      setLocalFinished(true);
    } else if (extinct || p1Static) {
      if (graceTicksRef.current === null) graceTicksRef.current = 10;
      graceTicksRef.current -= 1;
      if (graceTicksRef.current <= 0) {
        graceTicksRef.current = null;
        setLocalPlaying(false);
        setLocalFinished(true);
      }
    }
  }, [board, total, mode.maxTicks, updateHistoryAndCheckLoop]);

  useEffect(() => {
    hashHistoryRef.current = [];
    loopStreakRef.current = 0;
    graceTicksRef.current = null;
    p1PrevHashRef.current = null;
    p1StaticStreakRef.current = 0;
    if (!localPlaying) return;
    const id = setInterval(doStep, TICK_MS);
    return () => clearInterval(id);
  }, [localPlaying, doStep]);

  const handleStep = useCallback(() => {
    if (finished) return;
    doStep();
  }, [doStep, finished]);

  const handlePlayPause = useCallback(() => {
    if (finished) return;
    setLocalPlaying((p) => !p);
  }, [finished]);

  const handlePlayAgain = useCallback(() => {
    setLocalPlaying(false);
    setLocalFinished(false);
    setLocalTick(0);
    onPlayAgain();
  }, [onPlayAgain]);

  const handleReplay = useCallback(() => {
    onReplay();
    setLocalTick(0);
    setLocalFinished(false);
    setLocalCounts(() => {
      const c = countLiveByPlayer(board.alive, board.owner, total);
      return [c.p1, c.p2];
    });
    setRedrawKey((v) => v + 1);
    setTimeout(() => setLocalPlaying(true), 0);
  }, [onReplay, board, total]);

  const isMobile = window.matchMedia("(pointer: coarse)").matches;

  let winner: string | null = null;
  if (finished) {
    winner = mode.getWinner({ p1Live: counts[0], p2Live: counts[1], tick });
  }
  const winnerName =
    winner === "P1" ? players[0] : winner === "P2" ? players[1] : null;




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
      {/* Background moved to canvas area for visibility */}
      <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
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
          <span style={{ fontWeight: "bold", color: "var(--blue)" }}>
            Tick: {tick} / {mode.maxTicks}
          </span>
        </div>
      </div>

      {/* Mobile: prominent play/pause button between HUD and canvas */}
      {isMobile && (
        <button
          className="btn btn--primary"
          onClick={handlePlayPause}
          disabled={finished}
          style={{ width: "100%", fontSize: "1.1rem", fontWeight: 700 }}
        >
          {localPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      )}

      {/* Canvas */}
      <div style={{ position: "relative", flex: 1, display: "flex", minHeight: 0 }}>
        <LifeCanvas
          key={redrawKey}
          board={board}
          interactive={false}
          redrawRef={redrawRef}
          showTerritories
        />
        {/* Subtle vignette overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background:
              "radial-gradient(ellipse at center, transparent 40%, rgba(22,34,55,0.5) 100%)",
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {!isMobile && (
          <button
            className="btn"
            onClick={handlePlayPause}
            style={{ minWidth: 90 }}
            disabled={finished}
          >
            {localPlaying ? "Pause" : "Play"}
          </button>
        )}
        <button className="btn" onClick={handleStep} disabled={finished}>
          Step
        </button>
        {!aiMode && (
          <button className="btn" onClick={onReset}>
            Reset
          </button>
        )}
        <button
          className="btn"
          onClick={() => { setLocalPlaying(false); setConfirmRestart(true); }}
          disabled={finished}
        >
          Restart
        </button>
      </div>

      </div>
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
              minWidth: 280,
              maxWidth: "min(480px, 90vw)",
              width: "100%",
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
                {aiMode && (
                  <>
                    <button
                      className="btn"
                      onClick={() => {
                        const text = `I just scored ${counts[0]} vs AI ${counts[1]} at tick ${tick} playing Conway's Clash! Can you beat me?`;
                        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin)}`;
                        window.open(url, "_blank", "noopener,noreferrer");
                      }}
                    >
                      Share on X
                    </button>
                  </>
                )}
                {!aiMode && (
                  <button className="btn" onClick={onReset}>
                    Reset
                  </button>
                )}
              </>
            </div>
          </div>
        </div>
      )}
      {/* Restart confirmation */}
      {confirmRestart && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(22,34,55,0.7)",
            zIndex: 20,
          }}
        >
          <div
            className="glass"
            style={{
              padding: "32px 40px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              minWidth: 280,
            }}
          >
            <p style={{ margin: 0, fontSize: "1.1rem", textAlign: "center" }}>
              Restart with your current seed?
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn--primary"
                onClick={() => { setConfirmRestart(false); handlePlayAgain(); }}
              >
                Yes, restart
              </button>
              <button
                className="btn"
                onClick={() => { setConfirmRestart(false); setLocalPlaying(true); }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Public demo: no leaderboard modal */}
    </div>
  );
}
