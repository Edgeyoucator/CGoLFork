import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let firestore = null;

function loadCredentials() {
  const primaryJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (primaryJson) {
    return JSON.parse(primaryJson);
  }
  const credsJson = process.env.FIREBASE_ADMIN_CREDENTIALS_JSON;
  if (credsJson) {
    return JSON.parse(credsJson);
  }
  const credsPath = process.env.FIREBASE_ADMIN_CREDENTIALS_PATH;
  if (!credsPath) return null;
  const resolved = path.resolve(__dirname, "..", credsPath);
  const raw = fs.readFileSync(resolved, "utf-8");
  return JSON.parse(raw);
}

export function getDb() {
  if (firestore) return firestore;
  const creds = loadCredentials();
  if (!creds) {
    console.warn("Firebase Admin not configured; leaderboard writes disabled.");
    return null;
  }
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(creds),
    });
    if (creds && creds.project_id) {
      console.log(`Firebase Admin initialised (projectId=${creds.project_id})`);
    } else {
      console.log("Firebase Admin initialised");
    }
  }
  firestore = getFirestore();
  return firestore;
}

export { FieldValue };
