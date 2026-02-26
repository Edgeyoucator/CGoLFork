Increment 7: Multiplayer hardening – authoritative seed versioning, delta ACK/REJECT, phase-transition resync, and basic diagnostics.
No new gameplay features. Goal is robustness.

CONTEXT
We use delta seeding and auto-start when both ready.
A previous bug showed client/server divergence can cause cells to “disappear” and immediate draws.
We already fixed a client baseline issue, now we want a proper protocol-level solution.

A) Server authoritative seedVersion
- Add seedVersion:number per room on server.
- seedVersion increments on every accepted seed change.
- All seed broadcasts must include seedVersion.

B) Delta protocol upgrade: baseSeedVersion + ACK/REJECT
Client -> Server:
- seedDelta message must include:
  - roomId
  - clientId
  - baseSeedVersion (the client’s current seedVersion)
  - changes: [{i, alive}] (owner implied by role)

Server behaviour:
- If baseSeedVersion != current seedVersion:
  - reject and send seedState (full authoritative) with current seedVersion.
- Validate each change (territory, budget, role).
- If valid:
  - apply changes
  - seedVersion++
  - broadcast seedDeltaApplied { seedVersion, changes, appliedBy }
  - optionally also send a direct ACK to sender (can be same broadcast)

If invalid:
- send seedDeltaRejected { seedVersion, reason }
- send seedState { seedVersion, full board } to force baseline correction.

C) Mandatory resync at Ready->Play auto-start
When server detects both players ready and is about to start match:
1) broadcast seedState (full authoritative seed + seedVersion)
2) broadcast phaseChanged { phase:"play", tick:0, running:true }
3) start server tick loop

This ensures no in-flight deltas or divergence at match start.

D) Client behaviour updates
- Client stores seedVersion and applies seedState by replacing arrays and updating seedVersion.
- Client applies seedDeltaApplied only if it advances seedVersion correctly.
- On seedDeltaRejected or out-of-sync:
  - apply the provided seedState baseline and redraw.
- Remove any remaining local “optimistic only” assumptions that can diverge.
  (You may still optimistically draw locally, but must reconcile immediately on reject.)

E) Diagnostics (dev-only logging)
- Add optional debug flag (e.g. const DEBUG_SYNC = true) on both client and server.
- Log:
  - seedVersion on apply/reject
  - reason for rejects
  - phase transitions
Keep logs concise.

F) Ensure replay/play-again remain server authoritative
- watchReplay and playAgain should be client->server commands, server validates, broadcasts authoritative state.
- Clients should not directly mutate into replay state without server messages.

DELIVERABLE
Return full contents of changed files:
- server protocol + room logic
- src/net protocol + socket logic
- src/ui/SeedScreen.tsx and PlayScreen.tsx if needed for version handling
- any shared protocol/types
Include a short test checklist:
- two clients seed simultaneously
- induce out-of-sync by refreshing one client mid-seed
- both ready triggers resync then play
- verify no disappearing cells / immediate draw