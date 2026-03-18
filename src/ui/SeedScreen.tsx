import { useState, useCallback, useEffect, useRef } from "react";

const ABOUT_SLIDES = ["/images/1.webp", "/images/2.webp", "/images/3.webp"];
import { DEFAULT_BUDGET, countCells } from "../game/types";
import type { BoardState } from "../game/types";
import LifeCanvas from "../canvas/LifeCanvas";

interface Props {
  board: BoardState;
  players: [string, string];
  onBack: () => void;
  onAutoStart?: () => void;
  onClearAll?: () => void;
  onResetAI?: () => void;
  aiMode?: boolean;
}

const PLAYER_COLORS = ["var(--orange)", "var(--mint)"];

export default function SeedScreen({
  board,
  players,
  onBack,
  onAutoStart,
  onResetAI,
  aiMode = false,
}: Props) {
  const isSpectator = false;
  const playerRole = 0;

  const [activePlayer, setActivePlayer] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [counts, setCounts] = useState<[number, number]>(() => countCells(board));
  const redrawRef = useRef<(() => void) | null>(null);

  // Local-only ready state
  const [localReady, setLocalReady] = useState<[boolean, boolean]>(aiMode ? [false, true] : [false, false]);
  const autoStartedRef = useRef(false);

  const ready: [boolean, boolean] = localReady;

  const unreadyBoth = useCallback(() => {
    setLocalReady(aiMode ? [false, true] : [false, false]);
    autoStartedRef.current = false;
  }, [aiMode]);

  const recount = useCallback(() => {
    setCounts(countCells(board));
  }, [board]);

  // Local paint handling
  const handlePaint = useCallback(() => {
    recount();
    unreadyBoth();
  }, [recount, unreadyBoth]);

  // Local-only: no network snapshot to init
  useEffect(() => {}, [board]);

  // Local-only: no server sync
  useEffect(() => {
    // noop
  }, [recount, board.alive, board.owner]);

  // Local-only: no reject handling
  useEffect(() => {}, []);

  const getBudgetRemaining = useCallback(() => {
    return DEFAULT_BUDGET - counts[activePlayer];
  }, [counts, activePlayer]);

  const handleClearMyself = useCallback(() => {
    const total = board.alive.length;
    for (let i = 0; i < total; i++) {
      if (board.owner[i] === 0) {
        board.alive[i] = 0;
        board.owner[i] = -1;
      }
    }
    setCounts(countCells(board));
    redrawRef.current?.();
    unreadyBoth();
  }, [board, unreadyBoth]);

  const handleResetAI = useCallback(() => {
    onResetAI?.();
    setCounts(countCells(board));
    unreadyBoth();
  }, [board, onResetAI, unreadyBoth]);

  const toggleReady = useCallback((player: 0 | 1) => {
    setLocalReady((prev) => {
      const next: [boolean, boolean] = [...prev];
      next[player] = !next[player];
      return next;
    });
  }, []);

  // Local auto-start
  useEffect(() => {
    const aiReady = aiMode ? true : localReady[1];
    if (localReady[0] && aiReady && !autoStartedRef.current) {
      autoStartedRef.current = true;
      onAutoStart?.();
    }
  }, [localReady, onAutoStart, aiMode]);

  // Expose a way for App to bump version (seed state from server)
  // This is done via key prop on SeedScreen

  const roleLabel = null;

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
      {/* Preload about slides */}
      <div style={{ display: "none" }} aria-hidden="true">
        {ABOUT_SLIDES.map((src) => <img key={src} src={src} />)}
      </div>

      {/* About modal overlay */}
      <div
        onClick={() => setAboutOpen(false)}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 30,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          background: "rgba(0,0,0,0.55)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: aboutOpen ? 1 : 0,
          pointerEvents: aboutOpen ? "auto" : "none",
          transition: "opacity 0.15s ease",
        }}
      >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ position: "relative", display: "inline-block" }}
          >
            <img
              src={ABOUT_SLIDES[slideIndex]}
              alt={`About slide ${slideIndex + 1}`}
              style={{
                display: "block",
                maxHeight: "80vh",
                maxWidth: "90vw",
                borderRadius: 12,
                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              }}
            />
            <div style={{ position: "absolute", bottom: 20, left: 20 }}>
              {slideIndex < ABOUT_SLIDES.length - 1 ? (
                <button
                  className="btn btn--primary"
                  onClick={() => setSlideIndex((i) => i + 1)}
                >
                  Next
                </button>
              ) : (
                <button
                  className="btn btn--primary"
                  onClick={() => { setAboutOpen(false); setSlideIndex(0); }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>

      {/* About button — absolute left, vertically centred */}
      <button
        className="btn btn--glow"
        onClick={() => { setSlideIndex(0); setAboutOpen(true); }}
        style={{
          position: "absolute",
          left: 60,
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "20px 18px",
          fontSize: "0.85rem",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textAlign: "center",
          background: "rgba(241,95,36,0.2)",
          border: "1px solid var(--orange)",
          borderRadius: 14,
          lineHeight: 1.5,
          width: 160,
          color: "var(--mint)",
        }}
      >
        <span>What are<br />the rules?</span>
      </button>
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
              Playing as: {players[activePlayer]}
            </span>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <LifeCanvas
        board={board}
        activePlayer={activePlayer}
        onPaint={handlePaint}
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
        <button className="btn" onClick={onBack}>Back to Lobby</button>

        <button
          className="btn"
          onClick={() => toggleReady(0)}
          style={{
            borderColor: "var(--mint)",
            background: "rgba(134,218,189,0.15)",
            color: "var(--mint)",
          }}
        >
          {aiMode ? (ready[0] ? "Unready" : "Play") : `P1: ${ready[0] ? "Unready" : "Ready"}`}
        </button>

        {!aiMode && (
          <button
            className="btn"
            onClick={() => setActivePlayer((p) => (p === 0 ? 1 : 0))}
            style={{ borderColor: PLAYER_COLORS[activePlayer] }}
          >
            Switch to {players[activePlayer === 0 ? 1 : 0]}
          </button>
        )}

        {!isSpectator && (
          <button className="btn" onClick={handleClearMyself}>
            Clear my Cells
          </button>
        )}

        {aiMode && (
          <button className="btn" onClick={handleResetAI}>
            Reset AI Cells
          </button>
        )}

        <>
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
      </div>
    </div>
  );
}
