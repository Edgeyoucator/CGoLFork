import { useState } from "react";

interface Props {
  onContinue: (name: string) => void;
}

export default function Lobby({ onContinue }: Props) {
  const [name, setName] = useState("");

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="glass"
        style={{
          padding: "48px 40px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          width: 380,
        }}
      >
        <h1 style={{ textAlign: "center", fontSize: "1.8rem", marginBottom: 8 }}>
          Conway Duel
        </h1>

        <input
          className="input"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onContinue(name || "Player");
          }}
        />

        <button
          className="btn btn--primary"
          style={{ marginTop: 8 }}
          onClick={() => onContinue(name || "Player")}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
