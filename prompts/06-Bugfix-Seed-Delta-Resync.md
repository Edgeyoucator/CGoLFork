Bugfix: Seed delta resync + baseline correction (post-Increment 6)

Issue
Cells disappear after both players hit Ready, leading to an immediate draw.
Root cause is client/server seed divergence introduced by delta seeding:
- Client applies local edits immediately.
- Server validates and may reject deltas (territory/budget).
- Client did not reliably reconcile to authoritative state before play.

Fix Summary
1) Resync client baseline after any server seed update.
   - After SEED_STATE and SEED_DELTA, refresh lastSentRef to current board.
2) Ensure delta computation uses the current grid size constants.
   - Replace GRID_W * 50 with GRID_W * GRID_H.

Files to Change (no safeguards)
- src/ui/SeedScreen.tsx
  - Refresh lastSentRef after SEED_STATE and SEED_DELTA apply.
  - Use GRID_H for total cell count in delta diff.

Notes
- No server-side safeguard added (per request).
- This preserves server authority while keeping client deltas consistent.
