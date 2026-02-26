Increment AI-01: Add Play vs AI option (local mode) with stub AI seeding.
Do NOT change networking behaviour for Two Players mode. Keep online rooms intact.

GOAL
After the user enters their name, they choose:
- Two Players (existing online rooms flow)
- Play vs AI (new local flow)

In this increment, AI seeding can be a simple stub (fixed small pattern) so we can test the end-to-end loop.

REQUIREMENTS

A) Mode selection UI
- After name entry, show two buttons:
  1) “Two Players” -> go to existing Rooms screen and online multiplayer path.
  2) “Play vs AI” -> go to a local AI match setup (no server connection needed).
- Keep this clean and CATALYST-styled (liquid glass).

B) Local AI match flow (MVP plumbing)
- In Play vs AI mode:
  - Player is always P1 (left half).
  - AI is always P2 (right half).
  - Seed screen works as before for the human.
  - Replace P2 Ready toggle with a label “AI: Ready” (always ready).
  - When human clicks Ready, auto-start should occur immediately (because AI is ready).
  - Match runs locally (client-side engine), not through server.

C) Stub AI seeding
- On entering Seed screen in AI mode, pre-place a small fixed set of AI cells on the right half (e.g. a simple oscillator) within budget.
- Ensure those AI cells appear mint-owned (P2).
- Human cannot edit right half (already true via territory rules).

D) Reuse existing gameplay features
- Keep win condition: most cells at tick 200 (Classic Duel mode).
- Play Again should restore original seed snapshot (including AI’s initial seed).
- Watch Replay should rerun from original seed.

E) Code organisation
- Add a new folder src/ai/ and file src/ai/seedAI.ts, even if it only returns a stub pattern for now.
- Keep engine/modes logic unchanged.
- Keep React free of per-cell state.

DELIVERABLE
Return complete file contents for all changed/new files.
Do not add new mechanics, and do not break online multiplayer mode.