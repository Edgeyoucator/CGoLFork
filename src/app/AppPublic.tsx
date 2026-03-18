import { useCallback, useRef, useState } from "react";
import { createBoard, clearBoard, snapshotBoard, restoreBoard, GRID_W, GRID_H } from "../game/types";
import type { BoardState, SeedSnapshot } from "../game/types";
import { defaultMode } from "../game/modes";
import { seedAI } from "../ai/seedAI";
import Lobby from "../ui/Lobby";
import SeedScreen from "../ui/SeedScreen";
import PlayScreen from "../ui/PlayScreen";

type Screen = "lobby" | "seed" | "play";

export default function AppPublic() {
  const isMobile = window.matchMedia("(pointer: coarse)").matches;
  const [screen, setScreen] = useState<Screen>("lobby");
  const [players, setPlayers] = useState<[string, string]>(["Player", "AI"]);
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  const boardRef = useRef<BoardState>(createBoard());
  const snapshotRef = useRef<SeedSnapshot | null>(null);
  const [seedRenderKey, setSeedRenderKey] = useState(0);
  const aiMatchSeedRef = useRef(0);

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
    setSeedRenderKey((v) => v + 1);
  }, []);

  const handleAutoStart = useCallback(() => {
    snapshotRef.current = snapshotBoard(boardRef.current);
    setScreen("play");
  }, []);

  const handleClearAll = useCallback(() => {
    startAiSeedPhase();
    snapshotRef.current = null;
  }, [startAiSeedPhase]);

  const handleResetAI = useCallback(() => {
    const board = boardRef.current;
    const total = GRID_W * GRID_H;
    // Clear only AI cells
    for (let i = 0; i < total; i++) {
      if (board.owner[i] === 1) {
        board.alive[i] = 0;
        board.owner[i] = -1;
      }
    }
    // Re-seed AI
    const seed = (Date.now() ^ Math.floor(Math.random() * 1_000_000_000)) >>> 0;
    aiMatchSeedRef.current = seed;
    const indices = seedAI({ width: GRID_W, height: GRID_H, budget: 25, side: "right", rngSeed: seed });
    for (const i of indices) {
      board.alive[i] = 1;
      board.owner[i] = 1;
    }
    setSeedRenderKey((v) => v + 1);
    snapshotRef.current = null;
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (snapshotRef.current) {
      restoreBoard(boardRef.current, snapshotRef.current);
    } else {
      startAiSeedPhase();
    }
    setSeedRenderKey((v) => v + 1);
    setScreen("seed");
  }, [startAiSeedPhase]);

  const handleReplay = useCallback(() => {
    if (snapshotRef.current) {
      restoreBoard(boardRef.current, snapshotRef.current);
    }
  }, []);

  return (
    <>
      {/* Full-screen background — fixed so it covers every screen */}
      <img
        src="/images/zoomies.jpg"
        alt=""
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          zIndex: -2,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: -1,
          background: "rgba(22, 34, 55, 0.72)",
          pointerEvents: "none",
        }}
      />

      {screen === "lobby" && (
        <Lobby
          onContinue={(name) => {
            setPlayers([name || "Player", "AI"]);
            startAiSeedPhase();
            setScreen("seed");
            setShowHowToPlay(true);
          }}
        />
      )}

      {screen === "seed" && (
        <SeedScreen
          key={seedRenderKey}
          board={boardRef.current}
          players={players}
          aiMode
          onAutoStart={handleAutoStart}
          onClearAll={handleClearAll}
          onResetAI={handleResetAI}
          onBack={() => setScreen("lobby")}
        />
      )}

      {screen === "play" && (
        <PlayScreen
          board={boardRef.current}
          players={players}
          mode={defaultMode}
          hasSnapshot={!!snapshotRef.current}
          onPlayAgain={handlePlayAgain}
          onReplay={handleReplay}
          onReset={() => setScreen("seed")}
          aiMode
        />
      )}
      {showHowToPlay && (
        <div
          onClick={() => setShowHowToPlay(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <img
            src={isMobile ? "/video/how-to-play-mobile.gif" : "/video/how-to-play.gif"}
            alt="How to play"
            style={{
              maxHeight: "80vh",
              maxWidth: "90vw",
              borderRadius: 12,
              boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              pointerEvents: "none",
            }}
          />
        </div>
      )}
    </>
  );
}

