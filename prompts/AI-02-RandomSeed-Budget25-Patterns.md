Increment AI-02: AI seeding v1 (budget=25, new each match, pattern-based).
Do NOT change online multiplayer behaviour.

DEFINITIONS (be precise)
- “AI seed phase” = the Seed screen in Play vs AI mode.
- “New match” occurs when:
  1) user selects “Play vs AI” from the mode choice, entering AI seed phase
  2) user clicks “Play Again” from Results, which returns them to AI seed phase
- “Replay” refers ONLY to Watch Replay, which must rerun the last played match from its stored original seed snapshot (no regeneration).

BEHAVIOUR RULES
1) On entering AI seed phase for a new match:
   - Clear the entire board (both halves).
   - Generate a new rngSeed.
   - Use rngSeed to generate AI seed (exactly 25 cells) on the RIGHT half.
   - Apply AI cells (alive=1, owner=1) immediately.
   - Human can then seed their LEFT half as normal.

2) Clear All button (AI mode):
   - Clears the entire board (both halves).
   - Immediately generates a NEW rngSeed and re-seeds AI again (25 cells on right).
   - Human remains unready (and AI remains effectively ready).

3) Play Again button (from Results):
   - Returns to AI seed phase and starts a NEW match, meaning:
     - clear whole board
     - generate NEW rngSeed
     - AI reseeds 25 cells
     - human can adjust and then ready
   (Play Again is not “repeat same seed”, Watch Replay covers that.)

4) Watch Replay button:
   - Restores the stored originalSeed snapshot from the last match (including AI and human seeds).
   - Sets tick=0 and running=true, reruns deterministically.
   - MUST NOT generate a new rngSeed.

UI RULES (AI mode)
- Human is always P1 (left half).
- AI is always P2 (right half).
- “AI: Ready” is always shown as ready (no toggle).
- When human clicks Ready, match auto-starts immediately (because AI is ready).

IMPLEMENTATION REQUIREMENTS

A) Seed generation (src/ai/seedAI.ts)
Implement pattern-based seeding:
- Input: { width, height, budget, side:"right", rngSeed }
- Output: a list of indices (or changes) for AI cells.
Constraints:
- Must produce exactly budget=25 unique cells.
- All cells must be in AI half: x >= midX.
- Avoid edges with margin=2 (prefer x in [midX+2 .. width-3], y in [2 .. height-3]).
- Do not use Math.random inside seedAI.ts. Use a deterministic PRNG seeded by rngSeed (mulberry32 is fine).

Pattern library (relative coords):
- block (4)
- blinker (3)
- beacon or toad (6)
- glider (5)
Optionally lightweight spaceship if you want.

Placement strategy:
- Randomly place 2–4 patterns within AI half, no overlap, within bounds.
- Fill remaining cells to reach exactly 25 with clustered single cells near pattern centres (still within bounds, no duplicates).
- If placement fails after N attempts, fall back to random unique cells within AI half until budget met.

B) RNG seed handling
- Add an aiMatchSeed (number) stored in state/ref for AI mode.
- Generate a fresh aiMatchSeed on each “new match” entry into AI seed phase (as defined above) and on Clear All in AI mode.
- Ensure the seed used for AI placement is stable during that seed phase and the subsequent match start.

C) Integration points
- Ensure AI seeding runs at the correct times:
  - when entering AI seed phase as a new match
  - when Clear All pressed in AI mode
  - NOT during Watch Replay
- Ensure readiness resets correctly when board changes (human unready).

DELIVERABLE
Return full contents of changed files:
- src/ai/seedAI.ts
- Seed screen logic (where AI mode is handled)
- Any app-level state needed for aiMatchSeed
Do not alter online multiplayer flow.
Do not add difficulty settings yet.