import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAppCheck } from "firebase-admin/app-check";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import crypto from "node:crypto";
import { readFileSync } from "node:fs";

function credential() {
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    });
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    return cert(JSON.parse(readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_PATH, "utf8")));
  }
  return applicationDefault();
}

export const firebaseApp = getApps()[0] || initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID || "tsekap-student-health",
  credential: credential()
});
export const adminAuth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export { FieldValue, Timestamp };

export const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");
export const normalizeLrn = (value) => String(value || "").replace(/\D/g, "");
export const studentEmail = (lrnHash) => `lrn-${lrnHash}@students.tsekap.app`;

export async function verifyUser(request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw Object.assign(new Error("Please sign in."), { status: 401 });
  return adminAuth.verifyIdToken(token, true);
}

export async function verifyAdmin(request) {
  const decoded = await verifyUser(request);
  if (decoded.admin !== true) throw Object.assign(new Error("Administrator access is required."), { status: 403 });
  return decoded;
}

export async function verifyAppCheck(request) {
  if (process.env.REQUIRE_APP_CHECK !== "true") return;
  const token = request.headers.get("x-firebase-appcheck");
  if (!token) throw Object.assign(new Error("App verification failed."), { status: 401 });
  await getAppCheck(firebaseApp).verifyToken(token);
}

export async function rateLimit(request, limit = 8) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const bucket = Math.floor(Date.now() / 60000);
  const key = sha256(`${forwarded}:${bucket}`);
  const ref = db.collection("rateLimits").doc(key);
  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const count = snapshot.exists ? snapshot.data().count : 0;
    if (count >= limit) throw Object.assign(new Error("Too many attempts. Please wait a minute."), { status: 429 });
    transaction.set(ref, { count: count + 1, expiresAt: Timestamp.fromMillis((bucket + 2) * 60000) }, { merge: true });
  });
}

export async function audit(actor, action, targetUid, details = {}) {
  await db.collection("auditLogs").add({
    actorUid: actor.uid,
    actorEmail: actor.email || null,
    action,
    targetUid: targetUid || null,
    changedFields: details.changedFields || [],
    targetId: details.targetId || null,
    outcome: details.outcome || "success",
    note: details.note || null,
    createdAt: FieldValue.serverTimestamp()
  });
}
