interface Props {
  playerName: string;
  onOnline: () => void;
  onAi: () => void;
  onBack: () => void;
}

export default function ModeSelect({ playerName, onOnline, onAi, onBack }: Props) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        gap: 16,
      }}
    >
      <div
        className="glass"
        style={{
          padding: "24px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          minWidth: 320,
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.6rem" }}>Choose Mode</h1>
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.95rem" }}>
          Playing as: {playerName}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          <button className="btn btn--primary" onClick={onOnline}>
            Two Players
          </button>
          <button className="btn" onClick={onAi}>
            Play vs AI
          </button>
        </div>

        <button className="btn" onClick={onBack} style={{ marginTop: 8 }}>
          Back
        </button>
      </div>
    </div>
  );
}
