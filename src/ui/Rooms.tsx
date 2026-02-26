import { useEffect, useState } from "react";
import type { RoomInfo } from "../net/protocol.ts";
import LeaderboardModal from "./LeaderboardModal";

interface Props {
  rooms: RoomInfo[];
  onRefresh: () => void;
  onJoin: (roomId: number, spectate?: boolean) => void;
  onBack: () => void;
  playerName: string;
}

const phaseLabels: Record<string, string> = {
  seed: "Seeding",
  play: "Playing",
  done: "Results",
};

export default function Rooms({ rooms, onRefresh, onJoin, onBack, playerName }: Props) {
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <h1 style={{ fontSize: "1.6rem" }}>Rooms</h1>
      <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.9rem" }}>
        Playing as: {playerName}
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn" onClick={() => setLeaderboardOpen(true)}>
          See Leaderboard
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 12,
          width: "100%",
          maxWidth: 960,
          overflowY: "auto",
          flex: 1,
        }}
      >
        {rooms.map((room) => {
          const p1 = room.players[0];
          const p2 = room.players[1];
          const occupants = room.players.filter(Boolean).length;

          return (
            <div
              key={room.id}
              className="glass"
              style={{
                padding: "16px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <strong>{room.name}</strong>
                <span style={{ fontSize: "0.8em", color: "rgba(255,255,255,0.5)" }}>
                  {occupants}/2
                </span>
              </div>

              <div style={{ fontSize: "0.85em", color: "rgba(255,255,255,0.6)" }}>
                <div>
                  P1:{" "}
                  <span style={{ color: p1 ? "var(--orange)" : "rgba(255,255,255,0.3)" }}>
                    {p1 ? p1.name : "—"}
                  </span>
                </div>
                <div>
                  P2:{" "}
                  <span style={{ color: p2 ? "var(--mint)" : "rgba(255,255,255,0.3)" }}>
                    {p2 ? p2.name : "—"}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.8em",
                  color: "rgba(255,255,255,0.4)",
                }}
              >
                <span>{phaseLabels[room.phase] ?? room.phase}</span>
                {room.spectatorCount > 0 && (
                  <span>{room.spectatorCount} watching</span>
                )}
              </div>

              <button
                className="btn btn--primary"
                style={{ marginTop: 4, fontSize: "0.9rem", padding: "6px 16px" }}
                onClick={() => onJoin(room.id, occupants >= 2)}
              >
                {occupants >= 2 ? "Spectate" : "Join"}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 12 }}>
        <button className="btn" onClick={onBack}>
          Back
        </button>
        <button className="btn" onClick={onRefresh}>
          Refresh
        </button>
      </div>
      <LeaderboardModal open={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
    </div>
  );
}
