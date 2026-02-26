Increment: Global Leaderboard (Firestore) + overlay modal + seed previews.
Definitions:
- Score = final live cells at tick 100.
- Seed = original seed snapshot (the seed at match start).
- Leaderboard is global across ALL rooms.
- Only keep the best score per player (by clientId). If newScore > bestScore, overwrite. If equal, keep the most recent. If lower, ignore.

Architecture constraints:
- Server authoritative: the WebSocket game server writes leaderboard entries at match end.
- Clients are read-only for leaderboard (no client writes).
- React must not store per-cell state.

A) Data model (Firestore)
Collection: leaderboard
Document ID: clientId
Fields:
- clientId: string
- name: string
- bestScore: number
- seedCells: Array<{x:number,y:number}>  // full-board coordinates for that player's original seed only
- updatedAt: server timestamp
- modeId: string  // e.g. "classic_tick100"
- optional: lastRoomId: string

Write policy:
- On match end, for each player (P1 and P2), upsert leaderboard/{clientId} using a Firestore transaction:
  - if doc missing -> create
  - if doc exists:
    - if score > bestScore -> update
    - if score == bestScore -> update (most recent wins)
    - else do nothing

B) Server changes (WebSocket server)
- Add Firebase Admin SDK to the server.
- On match end (tick == 100), compute final live counts for P1 and P2.
- Extract each player's original seed from the stored original seed snapshot:
  - seedCells should include only cells owned by that player from original seed (NOT the full board).
  - store as {x,y} coordinates.
- Call a function like upsertLeaderboardEntry({clientId, name, score, seedCells, modeId, lastRoomId}).

C) Client changes (UI)
- Add a "See Leaderboard" button on the Results overlay/panel.
- Clicking opens a modal overlay (liquid glass) showing the global leaderboard (top 20).
- Leaderboard list shows: rank, name, bestScore, updatedAt (optional).
- Each entry has a "View seed" toggle that shows a mini-canvas preview of that seed.
  - Preview should render a small grid (e.g. 40x25 or scaled) and draw the seed cells in that player’s colour.
  - Keep it performant; no per-cell DOM.
- Close button to dismiss modal.

D) Client data access
Option 1 (preferred): client reads Firestore directly (read-only)
- Add Firebase web config to client.
- Subscribe to a query:
  - leaderboard ordered by bestScore desc, then updatedAt desc, limit 20
- Update UI live as new results come in.

E) Security rules
- Configure Firestore rules so:
  - leaderboard is readable by anyone (or by your chosen constraint)
  - leaderboard is NOT writable by clients (writes only via Admin SDK on server).

Deliverable:
- Provide complete code changes:
  - server: firebase admin init, leaderboard write logic, match-end hook
  - client: firebase init, leaderboard modal, mini-canvas renderer
  - any new shared types
- Keep tick limit at 100 for scoring and match end.
- Do not change existing networking/gameplay beyond what is needed.