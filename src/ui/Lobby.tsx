import { useState } from "react";

interface Props {
  onContinue: (name: string) => void;
}

const ABOUT_SLIDES = ["/images/1.webp", "/images/2.webp", "/images/3.webp"];

export default function Lobby({ onContinue }: Props) {
  const [name, setName] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);

  return (
    <div
      style={{
        height: "100%",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
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
          zIndex: 10,
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
            style={{
              position: "relative",
              display: "inline-block",
            }}
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
            <div
              style={{
                position: "absolute",
                bottom: 20,
                left: 20,
              }}
            >
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
      <video
        aria-hidden="true"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        src="/video/looping-squares.mp4"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "brightness(0.6) saturate(0.9)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          background:
            "radial-gradient(70% 60% at 50% 40%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />
      {/* Floating title */}
      <h1
        style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          fontFamily: "LeBeaune, serif",
          fontSize: "6rem",
          letterSpacing: "0.1em",
          whiteSpace: "nowrap",
          lineHeight: 1,
          pointerEvents: "none",
        }}
      >
        CONWAY'S CLASH
      </h1>

      {/* About button — bottom of screen */}
      <button
        className="btn"
        onClick={() => { setSlideIndex(0); setAboutOpen(true); }}
        style={{
          position: "absolute",
          bottom: 32,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          padding: "14px 28px",
          fontSize: "0.85rem",
          whiteSpace: "nowrap",
        }}
      >
        About Conway's Game of Life
      </button>

      {/* Card is the centred anchor; images hang off it absolutely */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          width: 380,
        }}
      >
        <img
          src="/images/developed at (2).png"
          alt="Developed at"
          style={{
            position: "absolute",
            right: "100%",
            top: "50%",
            transform: "translateY(-50%)",
            height: 300,
            objectFit: "contain",
            marginRight: 32,
          }}
        />

        <div
          className="glass"
          style={{
            padding: "24px 40px 48px",
            display: "flex",
            flexDirection: "column",
            gap: 20,
          }}
        >
          <p style={{ textAlign: "center", fontSize: "1.1rem", color: "rgba(255,255,255,0.75)", fontFamily: "LeBeaune, serif", letterSpacing: "0.08em" }}>
            TEST YOUR SKILLS
          </p>

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

        <img
          src="/images/logowhite.png"
          alt="Logo"
          style={{
            position: "absolute",
            left: "100%",
            top: "50%",
            transform: "translateY(-50%)",
            height: 300,
            objectFit: "contain",
            marginLeft: -70,
          }}
        />
      </div>
    </div>
  );
}
