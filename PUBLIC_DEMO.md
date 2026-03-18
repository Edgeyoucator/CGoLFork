Public Demo Build (AI‑only)

Overview
- This build removes all networking/multiplayer UI and logic.
- Flow: Lobby (enter name) → Seed vs AI → Play → Share result.
- A subtle looping background video plays on the lobby screen.

How it works
- `src/app/AppPublic.tsx` is a minimal app that reuses existing Seed/Play screens in AI mode only.
- `src/main.tsx` loads `AppPublic` directly. Multiplayer code has been removed.
- `src/ui/PlayScreen.tsx` includes “Share on LinkedIn” and “Copy Score” on finish.

Run locally (dev)
- Start dev server: `npm run dev`

Build for publishing
- Build: `npm run build`
- Preview: `npm run preview`

Notes
- The LinkedIn share button opens a share dialog using the current page URL with score/tick as query params for context.
- The multiplayer code is not imported in the public build entry, keeping the bundle focused on AI mode.
- Background video file is served from `public/video/looping-squares.mp4`.
