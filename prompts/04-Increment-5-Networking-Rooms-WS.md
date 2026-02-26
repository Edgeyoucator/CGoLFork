Increment 5: Add online multiplayer with rooms using WebSockets (server authoritative).
Keep gameplay rules exactly the same. Do NOT add fancy auth or persistence.

REQUIREMENTS OVERVIEW
Two players on different devices must be able to:
- enter name (no login)
- pick one of 20 rooms
- see who is waiting in each room
- join a room and be assigned P1 or P2
- seed only on their half
- ready/unready
- auto-start when both ready
- stay in sync during play (same board, same tick, same result)

TECH
- Add a Node server using the ws library (WebSocket).
- Keep rooms in memory only (no DB).
- Server is authoritative for:
  - room membership and roles
  - readiness
  - seed board state
  - simulation ticking (server runs the tick loop and broadcasts board state)

PROJECT STRUCTURE
Add:
server/
  index.ts (or index.js if not using TS)
  rooms.ts
  protocol.ts
src/net/
  socket.ts
  protocol.ts
Add new UI screen:
src/ui/Rooms.tsx

CLIENT UI FLOW
1) Lobby: user enters name and clicks Continue -> Rooms screen.
2) Rooms screen:
   - list 20 rooms (Room 1..Room 20)
   - show occupants (e.g. “Justin (P1) waiting”, “Empty”, “Full”)
   - click a room to join
   - show “Leave Room” button
3) Once in a room:
   - show Seed screen, but each client can only edit their own half (already exists).
   - Remove the “toggle active player” behaviour when networked:
     - active player is determined by assigned role from server (P1 or P2).
   - Ready button becomes per-client only (you can only toggle your own ready state).

NETWORKING BEHAVIOUR
- On connect, client sends {type:"hello", name}.
- Client requests rooms list.
- When client joins a room:
  - Server assigns role P1 if free else P2 if free else error.
  - Server sends roomState + current seed board (initially empty).
- Seeding:
  - When client paints/removes a cell in their territory, send update to server.
  - Server validates territory and budget, applies to canonical seed board, then broadcasts updated seed board to both clients.
  - Keep it simple: for this increment, you may send the full board arrays each update rather than diffs.
- Ready:
  - Client sends setReady {ready:boolean}.
  - Server stores readiness per player and broadcasts roomState.
  - AUTO-START: When both ready becomes true, server:
    - snapshots original seed
    - sets phase=play, tick=0, running=true
    - starts server-side tick loop at 12 ticks/sec
    - each tick: run engine.stepLife on canonical board, increment tick, broadcast boardState
    - stop at maxTicks from mode (200) and broadcast result + final boardState

GAME MODES
- Keep using src/game/modes.ts (Classic Duel maxTicks=200 winner by most cells at tick 200).
- Server uses the same engine and mode rules as client, but server is the one that runs them.

IMPORTANT CONSTRAINTS
- Do not move per-cell state into React.
- Keep engine logic reusable on server and client.
- Prefer to share engine/modes code between client and server (e.g. import from src/game) if feasible in the build setup. If not feasible quickly, duplicate minimal engine code in server with clear TODO to unify later.
- Keep it working and testable quickly, avoid overengineering.

DELIVERABLE
Return complete contents for all new/changed files:
- server/* (new)
- src/net/* (new)
- src/ui/Rooms.tsx (new)
- updates to App routing and screens
- updates to Seed/Play to support “networked role” (no active player toggle when connected)

Provide simple run instructions:
- how to start server
- how to start client
- what URL to open for two players