import { getDb, FieldValue } from "./firebaseAdmin.js";

export async function upsertLeaderboardEntry(entry) {
  const db = getDb();
  if (!db) return;

  const ref = db.collection("leaderboard").doc(entry.clientId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) {
      tx.set(ref, {
        clientId: entry.clientId,
        name: entry.name,
        bestScore: entry.score,
        seedCells: entry.seedCells,
        updatedAt: FieldValue.serverTimestamp(),
        modeId: entry.modeId,
        lastRoomId: entry.lastRoomId ?? null,
        color: entry.color,
      });
      return;
    }

    const data = snap.data() || {};
    const bestScore = Number(data.bestScore ?? -1);
    if (entry.score > bestScore || entry.score === bestScore) {
      tx.update(ref, {
        name: entry.name,
        bestScore: entry.score,
        seedCells: entry.seedCells,
        updatedAt: FieldValue.serverTimestamp(),
        modeId: entry.modeId,
        lastRoomId: entry.lastRoomId ?? null,
        color: entry.color,
      });
    }
  });
}
