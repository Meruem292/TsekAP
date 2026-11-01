import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
if (!credentialPath) throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is required.");
const serviceAccount = JSON.parse(await readFile(credentialPath, "utf8"));
const adminApp = initializeApp({ credential: cert(serviceAccount) }, "registration-smoke");
const adminAuth = getAuth(adminApp);
const db = getFirestore(adminApp);
const envText = await readFile(new URL("../.env", import.meta.url), "utf8");
const apiKey = envText.match(/^VITE_FIREBASE_API_KEY=(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");
if (!apiKey) throw new Error("VITE_FIREBASE_API_KEY is missing.");

const lrn = `98${Date.now().toString().slice(-10)}`;
const lrnHash = crypto.createHash("sha256").update(lrn).digest("hex");
const email = `lrn-${lrnHash}@students.tsekap.app`;
const password = `Flow${crypto.randomBytes(8).toString("hex")}7`;
const baseUrl = (process.env.TSEKAP_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
let uid;
let adminUid;

async function exchangeCustomToken(token) {
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token, returnSecureToken: true })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Admin sign-in failed: ${data?.error?.message || response.status}`);
  return data.idToken;
}

try {
  const registration = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      lrn,
      password,
      profile: { name: "Registration Flow Test", dob: "2010-01-15", sex: "female", conditions: ["none", "asthma"] }
    })
  });
  if (registration.status !== 201) throw new Error(`Registration returned ${registration.status}: ${await registration.text()}`);

  const signIn = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  const session = await signIn.json();
  if (!signIn.ok) throw new Error(`Sign-in failed: ${session?.error?.message || signIn.status}`);
  uid = session.localId;

  const profile = await fetch(`${baseUrl}/api/me`, { headers: { authorization: `Bearer ${session.idToken}` } });
  const profileBody = await profile.json();
  if (!profile.ok || profileBody.user?.status !== "pending") throw new Error("Pending profile was not returned after sign-in.");
  if (profileBody.user.conditions?.includes("none") || !profileBody.user.conditions?.includes("asthma")) throw new Error("Condition normalization failed.");

  const blockedCheckin = await fetch(`${baseUrl}/api/checkins`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.idToken}`, "content-type": "application/json" },
    body: JSON.stringify({ height: 165, weight: 55 })
  });
  if (blockedCheckin.status !== 403) throw new Error(`Pending check-in returned ${blockedCheckin.status}, expected 403.`);

  const adminUser = await adminAuth.getUserByEmail("newroskoto@gmail.com");
  adminUid = adminUser.uid;
  const adminToken = await exchangeCustomToken(await adminAuth.createCustomToken(adminUid));
  const approve = await fetch(`${baseUrl}/api/admin/users/${uid}/approve`, {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: "{}"
  });
  if (!approve.ok) throw new Error(`Admin approval returned ${approve.status}: ${await approve.text()}`);

  const allowedCheckin = await fetch(`${baseUrl}/api/checkins`, {
    method: "POST",
    headers: { authorization: `Bearer ${session.idToken}`, "content-type": "application/json" },
    body: JSON.stringify({ height: 165, weight: 55 })
  });
  if (allowedCheckin.status !== 201) throw new Error(`Approved check-in returned ${allowedCheckin.status}: ${await allowedCheckin.text()}`);

  const adminHistory = await fetch(`${baseUrl}/api/admin/users/${uid}/checkins`, { headers: { authorization: `Bearer ${adminToken}` } });
  const historyBody = await adminHistory.json();
  if (!adminHistory.ok || historyBody.checkins?.length !== 1) throw new Error("Administrator could not read the approved student's check-in.");

  const remove = await fetch(`${baseUrl}/api/admin/users/${uid}`, { method: "DELETE", headers: { authorization: `Bearer ${adminToken}` } });
  if (!remove.ok) throw new Error(`Admin deletion returned ${remove.status}: ${await remove.text()}`);
  console.log("Registration flow passed: pending access, admin approval, approved check-in, admin history, and cleanup.");
} finally {
  if (!uid) uid = await adminAuth.getUserByEmail(email).then((user) => user.uid).catch(() => null);
  if (uid) {
    const checkins = await db.collection("users").doc(uid).collection("checkins").get();
    const batch = db.batch();
    checkins.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(db.collection("users").doc(uid));
    batch.delete(db.collection("lrnIndex").doc(lrnHash));
    await batch.commit();
    await adminAuth.deleteUser(uid).catch(() => {});
  }
  if (uid) {
    const auditLogs = await db.collection("auditLogs").where("targetUid", "==", uid).get().catch(() => null);
    if (auditLogs?.size) {
      const auditBatch = db.batch();
      auditLogs.docs.forEach((doc) => auditBatch.delete(doc.ref));
      await auditBatch.commit();
    }
  }
}
