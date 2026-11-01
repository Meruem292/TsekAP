import { readFile } from "node:fs/promises";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "newroskoto@gmail.com").trim().toLowerCase();

if (!credentialPath) {
  throw new Error("Set FIREBASE_SERVICE_ACCOUNT_PATH to a service-account JSON file outside the repository.");
}

const serviceAccount = JSON.parse(await readFile(credentialPath, "utf8"));
const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
const auth = getAuth(app);
const firestore = getFirestore(app);

let user;
try {
  user = await auth.getUserByEmail(adminEmail);
} catch (error) {
  if (error?.code !== "auth/user-not-found") throw error;
  user = await auth.createUser({ email: adminEmail, disabled: false });
}

await auth.setCustomUserClaims(user.uid, { ...(user.customClaims || {}), admin: true });
await firestore.collection("users").doc(user.uid).set({
  role: "admin",
  approvalStatus: "approved",
  email: adminEmail,
  displayName: "TsekAP Administrator",
  disabled: false,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp()
}, { merge: true });

console.log(`Administrator ready: ${adminEmail}`);

if (process.env.SEND_PASSWORD_SETUP_EMAIL === "true") {
  const apiKey = process.env.VITE_FIREBASE_API_KEY;
  if (!apiKey) throw new Error("VITE_FIREBASE_API_KEY is required to send the password-setup email.");

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ requestType: "PASSWORD_RESET", email: adminEmail })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error?.message || "Firebase could not send the password-setup email.");
  }

  console.log(`Password-setup email sent to ${adminEmail}.`);
} else {
  console.log("Use the Administrator sign-in screen's password-reset action to set the first password.");
}
