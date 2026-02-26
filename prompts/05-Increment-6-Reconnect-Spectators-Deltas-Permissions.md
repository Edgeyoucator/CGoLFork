Increment 6: Make multiplayer robust.
Add reconnect identity, optional spectators, seed deltas, clearer room status, and role-based UI permissions.
Do NOT add a database, authentication, or persistence beyond localStorage clientId.

A) Client identity + reconnect
- On client load, generate a clientId (UUID) and store in localStorage if not present.
- hello message becomes: {type:"hello", name, clientId}
- Server must use clientId to track player slots in rooms.

Reconnect behaviour:
- If a websocket disconnects and later reconnects with same clientId:
  - If that clientId previously occupied P1 or P2 in a room and that slot is still reserved for them, they reclaim it.
  - They receive the current authoritative roomState + boardState immediately.
- If their previous room is unknown, they proceed normally.

B) Spectator mode (recommended)
- If a user joins a room and both player slots are already taken by different clientIds:
  - Join as spectator (read-only) rather than error.
- Spectators should:
  - See the board update live (seed/play/replay)
  - See room status and result panels
  - Not be able to seed, ready, or trigger match start
UI should clearly show role: “You are P1 / P2 / Spectator”.

C) Seed updates switch to deltas
- Replace sending full board arrays on every seed edit.
- Client sends: {type:"seedDelta", roomId, changes:[{i:number, alive:0|1}]}
  - Owner is implied by role and validated by server.
- Server validates:
  - index i is in that player’s territory
  - budget not exceeded
  - applies to canonical seed board (alive/owner)
- Server broadcasts the same delta to all clients in room:
  {type:"seedDelta", changes:[...], appliedBy:"P1"|"P2"}
- Clients apply deltas to their local arrays and redraw.

Note:
- Server should still send full boardState on join/reconnect so clients can resync.

D) Room list status improvements
Rooms list should show for each room:
- occupancy: 0/2, 1/2, 2/2 (players only)
- player names in P1 and P2 slots
- phase: seeding | playing | results
- number of spectators (optional but nice)
Update server to broadcast rooms summary whenever any room changes.

E) Role-based UI permissions
- Remove the old “toggle active player” concept entirely in networked mode.
- Only players (P1/P2) can seed, only in their half.
- Only players can toggle their own ready/unready.
- Spectators see a read-only board and read-only status.

F) Replay trigger as server command
- “Watch Replay” should be a client->server message: {type:"watchReplay", roomId}
- Only allow if phase is results (or allow anytime, but simplest is results only).
- Server restores originalSeed snapshot, tick=0, running=true, broadcasts state, and runs simulation again.
- Allow either P1 or P2 to trigger it. Spectators cannot.

G) Deliverables
Return full contents of changed/new files:
- server protocol/types updates
- server room state management for clientId + spectators
- src/net protocol/types updates
- Rooms UI updates
- Seed/Play UI changes for permissions + role display
Include run/test instructions:
- how to test reconnect (refresh)
- how to test spectator (3rd browser)
- how to verify deltas apply correctly