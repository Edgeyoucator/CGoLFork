import { useState } from "react";

interface Props {
  onContinue: (name: string) => void;
}

const ABOUT_SLIDES = ["/images/1.webp", "/images/2.webp", "/images/3.webp"];

export default function Lobby({ onContinue }: Props) {
  const [name, setName] = useState("");
  const [shake, setShake] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const isMobile = window.matchMedia("(pointer: coarse)").matches;

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
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
            }}
          >
            <img
              src={ABOUT_SLIDES[slideIndex]}
              alt={`About slide ${slideIndex + 1}`}
              style={{
                display: "block",
                maxHeight: "72vh",
                maxWidth: "90vw",
                borderRadius: 12,
                boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
              }}
            />
            <div>
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
          fontSize: isMobile ? "clamp(3rem, 12vw, 6rem)" : "6rem",
          letterSpacing: "0.1em",
          lineHeight: 1.1,
          textAlign: "center",
          whiteSpace: isMobile ? "normal" : "nowrap",
          pointerEvents: "none",
        }}
      >
        {isMobile ? <>CONWAY'S<br />CLASH</> : "CONWAY'S CLASH"}
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
          width: "min(380px, 90vw)",
        }}
      >
        {!isMobile && (
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
        )}

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
            className={`input${shake ? " input--error" : ""}`}
            placeholder="Your name"
            value={name}
            inputMode="text"
            autoComplete="off"
            onChange={(e) => { setName(e.target.value); setShake(false); }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!name.trim()) {
                  setShake(false);
                  requestAnimationFrame(() => setShake(true));
                  return;
                }
                (e.currentTarget as HTMLElement).blur();
                onContinue(name.trim());
              }
            }}
          />

          <button
            className="btn btn--primary"
            style={{ marginTop: 8 }}
            disabled={!name.trim()}
            onClick={(e) => {
              (e.currentTarget as HTMLElement).blur();
              onContinue(name.trim());
            }}
          >
            Continue
          </button>

        </div>

        {isMobile && (
          <div style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingLeft: 8,
            paddingRight: 8,
          }}>
            <img
              src="/images/developed at (2).png"
              alt="Developed at"
              style={{ height: 80, objectFit: "contain" }}
            />
            <img
              src="/images/logowhite.png"
              alt="Logo"
              style={{ height: 80, objectFit: "contain" }}
            />
          </div>
        )}

        {!isMobile && (
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
        )}
      </div>
    </div>
  );
}
