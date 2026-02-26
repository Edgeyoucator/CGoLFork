import { useEffect, useMemo, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "../firebase/client";

type SeedCell = { x: number; y: number };

interface LeaderboardEntry {
  clientId: string;
  name: string;
  bestScore: number;
  seedCells: SeedCell[];
  updatedAt?: { toDate: () => Date };
  color?: "P1" | "P2";
}

interface Props {
  open: boolean;
  onClose: () => void;
}

function SeedPreview({ cells, color }: { cells: SeedCell[]; color: "P1" | "P2" }) {
  const canvasRef = useMemo(() => ({ current: null as HTMLCanvasElement | null }), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gridW = 80;
    const gridH = 50;
    const cell = 3;
    canvas.width = gridW * cell;
    canvas.height = gridH * cell;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = color === "P1" ? "#f15f24" : "#86dabd";

    for (const c of cells) {
      const x = c.x;
      const y = c.y;
      if (x < 0 || x >= gridW || y < 0 || y >= gridH) continue;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }, [cells, color, canvasRef]);

  return (
    <canvas
      ref={(el) => {
        canvasRef.current = el;
      }}
      style={{ borderRadius: 6, background: "rgba(0,0,0,0.25)" }}
    />
  );
}

export default function LeaderboardModal({ open, onClose }: Props) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const q = query(
      collection(db, "leaderboard"),
      orderBy("bestScore", "desc"),
      orderBy("updatedAt", "desc"),
      limit(20),
    );
    const unsub = onSnapshot(q, (snap) => {
      const rows: LeaderboardEntry[] = [];
      snap.forEach((doc) => {
        const d = doc.data() as LeaderboardEntry;
        rows.push(d);
      });
      setEntries(rows);
    });
    return () => unsub();
  }, [open]);

  if (!open) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10,16,28,0.6)",
        zIndex: 20,
      }}
    >
      <div
        className="glass"
        style={{
          width: "min(860px, 92vw)",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: 20,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Global Leaderboard</h2>
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>

        <div style={{ overflowY: "auto", paddingRight: 4, flex: 1, minHeight: 0 }}>
          {entries.map((e, idx) => {
            const updated = e.updatedAt?.toDate ? e.updatedAt.toDate().toLocaleString() : "";
            const color = e.color ?? "P1";
            const expanded = expandedId === e.clientId;
            return (
              <div
                key={e.clientId}
                className="glass"
                style={{
                  padding: "12px 14px",
                  marginBottom: 10,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <strong style={{ minWidth: 28 }}>#{idx + 1}</strong>
                    <span>{e.name}</span>
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>
                      Score: {e.bestScore}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)" }}>
                      {updated}
                    </span>
                    <button
                      className="btn"
                      onClick={() => setExpandedId(expanded ? null : e.clientId)}
                    >
                      {expanded ? "Hide Seed" : "View Seed"}
                    </button>
                  </div>
                </div>
                {expanded && (
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <SeedPreview cells={e.seedCells ?? []} color={color} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
