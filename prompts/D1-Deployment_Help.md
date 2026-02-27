We are deploying this project with:
- Backend (Node WebSocket server) hosted on Render
- Frontend (Vite/React) hosted on Vercel

Do NOT give generic advice. Inspect and align with THIS codebase and folder structure.
I want step-by-step instructions that match the exact scripts, ports, paths, and env vars used here.

PHASE 1 (THIS TASK): Render backend deployment only.
Later we will do Vercel in a separate prompt.

=== WHAT YOU MUST PRODUCE ===
1) A short plan overview (Render backend now, Vercel frontend later).
2) A “project readiness checklist” with any code edits needed for Render to run server reliably.
3) Exact Render setup instructions (click-by-click), including:
   - whether this should be a Web Service
   - the correct Build Command and Start Command for THIS repo
   - required environment variables and where they are read in code
   - how to restart/redeploy after env changes
4) A “verification checklist” to confirm backend is working (logs to look for, URLs to test).
5) A “troubleshooting section” that references the likely errors for THIS codebase (PORT binding, WS path, CORS/origin checks, Firebase admin init).

=== CONTEXT / CONSTRAINTS ===
- Repo structure includes a /server folder containing the multiplayer server.
- The backend must listen on process.env.PORT and run as a long-lived WebSocket service.
- We already have a global Firestore leaderboard working locally, and the server writes using Firebase Admin.
- We want clients to be read-only for leaderboard, so server needs Firebase Admin credentials in production.

=== PROJECT SETUP TASKS (DO THESE FIRST) ===
A) Confirm server binds correctly on Render
- Ensure server uses `const PORT = process.env.PORT || <devPort>` and listens on that.
- Ensure it binds on all interfaces (default Node listen is fine).
- Ensure the WebSocket server attaches to the HTTP server properly.

B) Confirm environment variable usage in server code
- Identify exactly how Firebase Admin is initialised.
- Implement robust parsing of `FIREBASE_SERVICE_ACCOUNT_JSON` as the primary method.
- Add clear startup logs:
  - “Server listening on PORT=…”
  - “Firebase admin initialised (projectId=…)”
- Ensure secrets are not committed, and `.gitignore` covers `.env*` and any local key files.

C) Provide Render-ready scripts (only if needed)
- If current repo scripts are ambiguous, add a script like:
  - `"server:prod": "node server/index.js"`
- But do not change working scripts unnecessarily.

D) Health check endpoint (if missing)
- Add a simple GET /health endpoint that returns 200 OK and basic status JSON.
- This helps test Render deployment quickly.

=== RENDER-SIDE SETUP INSTRUCTIONS (MATCH THIS CODEBASE) ===
Provide exact steps to create a Render Web Service from GitHub:
- Which repo to select
- Which branch
- Root directory (repo root vs /server) based on actual package.json structure
- Build command (likely `npm ci` or `npm install`)
- Start command (exact, e.g. `node server/index.js`)
- Required env vars to add on Render:
  - NODE_ENV=production
  - FIREBASE_SERVICE_ACCOUNT_JSON=<full service account json>
  - Any other env vars actually used by server (e.g. ALLOWED_ORIGIN)
- Explain exactly where to paste each env var in the Render UI.

=== OUTPUT FORMAT ===
- Use headings and numbered steps.
- Include the exact commands and exact places to click.
- Keep everything specific to this repository.
- Do NOT include Vercel steps yet.