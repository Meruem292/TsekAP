import crypto from "node:crypto";
import {
  adminAuth, audit, db, FieldValue, normalizeLrn, rateLimit, sha256, studentEmail, Timestamp,
  verifyAdmin, verifyAppCheck, verifyUser
} from "../server/firebase-admin.js";
import { calculateBmi, completedAgeMonths, RETENTION_DAYS, retentionExpiry } from "../shared/bmi.js";

const json = (data, status = 200, headers = {}) => Response.json(data, {
  status,
  headers: { "cache-control": "no-store", ...headers }
});

function withinRetentionWindow(value) {
  const date = value?.toDate?.() || new Date(value);
  return !Number.isNaN(date.getTime()) && date.getTime() >= Date.now() - RETENTION_DAYS * 86400000;
}

async function body(request) {
  try { return await request.json(); }
  catch { throw Object.assign(new Error("A valid JSON body is required."), { status: 400 }); }
}

function route(request) {
  return new URL(request.url).pathname.replace(/^\/api\/?/, "").replace(/\/+$/, "");
}

function validatePassword(password) {
  if (typeof password !== "string" || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw Object.assign(new Error("Use at least 8 characters with a letter and a number."), { status: 400 });
  }
}

function validateProfile(input = {}) {
  const name = String(input.name || "").trim();
  const dob = String(input.dob || "");
  const sex = input.sex;
  const ageMonths = completedAgeMonths(dob);
  if (name.length < 2 || name.length > 100) throw Object.assign(new Error("Enter the student’s full name."), { status: 400 });
  if (!["female", "male"].includes(sex)) throw Object.assign(new Error("Select the sex used by the WHO reference."), { status: 400 });
  if (!Number.isFinite(ageMonths) || ageMonths < 180 || ageMonths > 227) throw Object.assign(new Error("TsekAP currently supports students aged 15 through 18."), { status: 400 });
  const allowedConditions = new Set(["none", "asthma", "heart", "hypertension", "diabetes", "epilepsy", "arthritis", "injury", "allergy", "celiac", "other", "private"]);
  let conditions = Array.isArray(input.conditions) ? [...new Set(input.conditions.map(String))].filter((value) => allowedConditions.has(value)).slice(0, 12) : [];
  if (conditions.includes("none") && conditions.length > 1) conditions = conditions.filter((value) => value !== "none");
  return { name, dob, sex, conditions, otherCondition: String(input.otherCondition || "").trim().slice(0, 160) };
}

function publicUser(snapshot) {
  const data = snapshot.data();
  return { uid: snapshot.id, ...data, createdAt: data.createdAt?.toDate?.()?.toISOString?.() || null, updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() || null };
}

async function reserveAndCreateStudent({ lrn, password, profile, status, createdBy, mustChangePassword = false }) {
  const normalized = normalizeLrn(lrn);
  if (!/^\d{12}$/.test(normalized)) throw Object.assign(new Error("Enter a valid 12-digit LRN."), { status: 400 });
  validatePassword(password);
  const cleanProfile = validateProfile(profile);
  const lrnHash = sha256(normalized);
  const indexRef = db.collection("lrnIndex").doc(lrnHash);
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(indexRef);
    if (existing.exists) throw Object.assign(new Error("An account already exists for this LRN."), { status: 409 });
    transaction.create(indexRef, { status: "reserved", createdAt: FieldValue.serverTimestamp() });
  });
  let authUser;
  try {
    authUser = await adminAuth.createUser({ email: studentEmail(lrnHash), password, displayName: cleanProfile.name });
    const userRef = db.collection("users").doc(authUser.uid);
    await db.runTransaction(async (transaction) => {
      transaction.set(userRef, {
        role: "student", status, lrn: normalized, lrnHash, ...cleanProfile,
        mustChangePassword, approvalNote: null, migrationCompletedAt: null,
        createdBy, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp()
      });
      transaction.set(indexRef, { uid: authUser.uid, status: "active", createdAt: FieldValue.serverTimestamp() });
    });
    return { uid: authUser.uid, name: cleanProfile.name, status };
  } catch (error) {
    await indexRef.delete().catch(() => {});
    if (authUser?.uid) await adminAuth.deleteUser(authUser.uid).catch(() => {});
    throw error;
  }
}

async function register(request) {
  await verifyAppCheck(request);
  await rateLimit(request, 5);
  const input = await body(request);
  const student = await reserveAndCreateStudent({
    ...input, status: "pending", createdBy: "self-registration"
  });
  return json({ ok: true, student, message: "Registration received. An administrator must approve it before health records are available." }, 201);
}

async function me(request) {
  const actor = await verifyUser(request);
  const userSnap = await db.collection("users").doc(actor.uid).get();
  if (!userSnap.exists) return json({ error: "Profile setup is incomplete." }, 404);
  const profile = publicUser(userSnap);
  let checkins = [];
  if (profile.role === "student" && profile.status === "approved") {
    const snapshots = await userSnap.ref.collection("checkins").orderBy("date", "desc").limit(100).get();
    checkins = snapshots.docs.filter((doc) => withinRetentionWindow(doc.data().date)).map((doc) => ({ id: doc.id, ...doc.data(), date: doc.data().date?.toDate?.()?.toISOString?.() || doc.data().date }));
  }
  return json({ user: profile, checkins, claims: { admin: actor.admin === true } });
}

async function createCheckin(request) {
  const actor = await verifyUser(request);
  const userRef = db.collection("users").doc(actor.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists || userSnap.data().role !== "student" || userSnap.data().status !== "approved") {
    throw Object.assign(new Error("Your student account is not approved."), { status: 403 });
  }
  const input = await body(request);
  const measuredAt = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(measuredAt.getTime())) {
    throw Object.assign(new Error("Enter a valid measurement date."), { status: 400 });
  }
  if (measuredAt.getTime() > Date.now() + 5 * 60000 || !withinRetentionWindow(measuredAt)) {
    throw Object.assign(new Error(`Measurements must be within the last ${RETENTION_DAYS} days and cannot be in the future.`), { status: 400 });
  }
  const clientRequestId = input.clientRequestId == null ? null : String(input.clientRequestId);
  if (clientRequestId && !/^[A-Za-z0-9_-]{16,80}$/.test(clientRequestId)) {
    throw Object.assign(new Error("The check-in request identifier is invalid."), { status: 400 });
  }
  const ageMonths = completedAgeMonths(userSnap.data().dob, measuredAt);
  const result = calculateBmi(input.height, input.weight, ageMonths, userSnap.data().sex);
  const ref = clientRequestId
    ? userRef.collection("checkins").doc(`client-${sha256(`${actor.uid}:${clientRequestId}`).slice(0, 40)}`)
    : userRef.collection("checkins").doc();
  const record = {
    studentId: actor.uid, date: Timestamp.fromDate(measuredAt), expiresAt: Timestamp.fromDate(retentionExpiry(measuredAt)), height: Number(input.height), weight: Number(input.weight),
    ageMonths, ...result, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid
  };
  let deduplicated = false;
  if (clientRequestId) {
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (!existing.exists) {
        transaction.create(ref, { ...record, clientRequestId });
        return;
      }
      const saved = existing.data();
      const savedDate = saved.date?.toDate?.() || new Date(saved.date);
      const matches = Number(saved.height) === Number(input.height)
        && Number(saved.weight) === Number(input.weight)
        && savedDate.getTime() === measuredAt.getTime();
      if (!matches) {
        throw Object.assign(new Error("This request identifier was already used for different measurements."), { status: 409 });
      }
      deduplicated = true;
    });
  } else {
    await ref.set(record);
  }
  return json({ ok: true, id: ref.id, deduplicated, ...result }, deduplicated ? 200 : 201);
}

async function changePassword(request) {
  const actor = await verifyUser(request);
  const input = await body(request);
  validatePassword(input.password);
  await adminAuth.updateUser(actor.uid, { password: input.password });
  await db.collection("users").doc(actor.uid).update({ mustChangePassword: false, updatedAt: FieldValue.serverTimestamp() });
  return json({ ok: true });
}

async function deleteOwnAccount(request) {
  const actor = await verifyUser(request);
  const ref = db.collection("users").doc(actor.uid);
  const snapshot = await ref.get();
  if (!snapshot.exists || snapshot.data().role !== "student") throw Object.assign(new Error("Student account not found."), { status: 404 });
  await deleteStudentData(actor.uid, snapshot.data());
  await adminAuth.deleteUser(actor.uid);
  return json({ ok: true });
}

async function importLocal(request) {
  const actor = await verifyUser(request);
  const userRef = db.collection("users").doc(actor.uid);
  const userSnap = await userRef.get();
  const user = userSnap.data();
  if (!user || user.status !== "approved") throw Object.assign(new Error("Account approval is required before import."), { status: 403 });
  const input = await body(request);
  const profile = input.profile || {};
  if (profile.dob !== user.dob || profile.sex !== user.sex) throw Object.assign(new Error("The local profile does not match this cloud account."), { status: 409 });
  const records = Array.isArray(input.records) ? input.records.slice(0, 200) : [];
  let imported = 0;
  for (const source of records) {
    const stableId = sha256(`${source.id || ""}:${source.date || ""}:${source.height || ""}:${source.weight || ""}`).slice(0, 28);
    const ref = userRef.collection("checkins").doc(`local-${stableId}`);
    if ((await ref.get()).exists) continue;
    const date = new Date(source.date);
    if (Number.isNaN(date.getTime()) || !withinRetentionWindow(date)) continue;
    const ageMonths = completedAgeMonths(user.dob, date);
    const result = calculateBmi(source.height, source.weight, ageMonths, user.sex);
    await ref.set({
      studentId: actor.uid, date: Timestamp.fromDate(date), expiresAt: Timestamp.fromDate(retentionExpiry(date)), height: Number(source.height), weight: Number(source.weight), ageMonths, ...result,
      importedFromLocal: true, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid
    });
    imported += 1;
  }
  await userRef.update({ migrationCompletedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return json({ ok: true, imported });
}

async function adminStudents(request) {
  await verifyAdmin(request);
  const url = new URL(request.url);
  const search = (url.searchParams.get("search") || "").trim().toLowerCase();
  const snapshots = await db.collection("users").where("role", "==", "student").orderBy("createdAt", "desc").limit(250).get();
  let users = snapshots.docs.map(publicUser);
  if (search) users = users.filter((user) => user.name?.toLowerCase().includes(search) || user.lrn?.includes(search));
  return json({ users, total: users.length });
}

async function adminAudit(request) {
  await verifyAdmin(request);
  const snapshots = await db.collection("auditLogs").orderBy("createdAt", "desc").limit(150).get();
  return json({ logs: snapshots.docs.map((doc) => ({ id: doc.id, ...doc.data(), createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() || null })) });
}

async function adminCreateUser(request) {
  const actor = await verifyAdmin(request);
  const input = await body(request);
  const password = input.password || generateTemporaryPassword();
  const student = await reserveAndCreateStudent({ ...input, password, status: input.status === "pending" ? "pending" : "approved", createdBy: actor.uid, mustChangePassword: true });
  await audit(actor, "student.create", student.uid, { changedFields: ["profile", "status"] });
  return json({ ok: true, student, temporaryPassword: password }, 201);
}

async function adminUpdateUser(request, uid) {
  const actor = await verifyAdmin(request);
  const input = await body(request);
  const allowed = ["name", "dob", "sex", "conditions", "otherCondition", "approvalNote"];
  const updates = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.includes(key)));
  if (["dob", "sex", "name"].some((key) => key in updates)) {
    const current = (await db.collection("users").doc(uid).get()).data();
    Object.assign(updates, validateProfile({ ...current, ...updates }));
  }
  updates.updatedAt = FieldValue.serverTimestamp();
  await db.collection("users").doc(uid).update(updates);
  if (updates.name) await adminAuth.updateUser(uid, { displayName: updates.name });
  await audit(actor, "student.update", uid, { changedFields: Object.keys(updates).filter((key) => key !== "updatedAt") });
  return json({ ok: true });
}

async function adminStatus(request, uid, status) {
  const actor = await verifyAdmin(request);
  const input = await body(request).catch(() => ({}));
  const ref = db.collection("users").doc(uid);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("Student not found."), { status: 404 });
  await ref.update({ status, approvalNote: String(input.note || "").slice(0, 300) || null, approvedAt: status === "approved" ? FieldValue.serverTimestamp() : null, approvedBy: status === "approved" ? actor.uid : null, updatedAt: FieldValue.serverTimestamp() });
  await adminAuth.updateUser(uid, { disabled: false });
  await audit(actor, `student.${status}`, uid, { changedFields: ["status", "approvalNote"], note: input.note });
  return json({ ok: true });
}

async function adminToggleDisabled(request, uid) {
  const actor = await verifyAdmin(request);
  const input = await body(request);
  const disabled = Boolean(input.disabled);
  await adminAuth.updateUser(uid, { disabled });
  await db.collection("users").doc(uid).update({ disabled, updatedAt: FieldValue.serverTimestamp() });
  await audit(actor, disabled ? "student.disable" : "student.enable", uid, { changedFields: ["disabled"] });
  return json({ ok: true });
}

async function adminResetPassword(request, uid) {
  const actor = await verifyAdmin(request);
  const password = generateTemporaryPassword();
  await adminAuth.updateUser(uid, { password, disabled: false });
  await db.collection("users").doc(uid).update({ mustChangePassword: true, updatedAt: FieldValue.serverTimestamp() });
  await audit(actor, "student.password-reset", uid, { changedFields: ["mustChangePassword"] });
  return json({ ok: true, temporaryPassword: password });
}

async function adminDeleteUser(request, uid) {
  const actor = await verifyAdmin(request);
  const ref = db.collection("users").doc(uid);
  const snapshot = await ref.get();
  if (!snapshot.exists) throw Object.assign(new Error("Student not found."), { status: 404 });
  await deleteStudentData(uid, snapshot.data());
  await adminAuth.deleteUser(uid).catch((error) => { if (error.code !== "auth/user-not-found") throw error; });
  await audit(actor, "student.delete", uid, { changedFields: ["account", "profile", "checkins"] });
  return json({ ok: true });
}

async function adminCheckins(request, uid) {
  await verifyAdmin(request);
  const snapshots = await db.collection("users").doc(uid).collection("checkins").orderBy("date", "desc").limit(250).get();
  return json({ checkins: snapshots.docs.filter((doc) => withinRetentionWindow(doc.data().date)).map((doc) => ({ id: doc.id, ...doc.data(), date: doc.data().date?.toDate?.()?.toISOString?.() || null })) });
}

async function adminMutateCheckin(request, uid, id, method) {
  const actor = await verifyAdmin(request);
  const ref = db.collection("users").doc(uid).collection("checkins").doc(id);
  if (method === "DELETE") {
    await ref.delete();
    await audit(actor, "checkin.delete", uid, { targetId: id, changedFields: ["checkin"] });
    return json({ ok: true });
  }
  const input = await body(request);
  const user = (await db.collection("users").doc(uid).get()).data();
  if (!user) throw Object.assign(new Error("Student not found."), { status: 404 });
  const existing = await ref.get();
  if (!existing.exists) throw Object.assign(new Error("Check-in not found."), { status: 404 });
  const date = input.date ? new Date(input.date) : existing.data().date.toDate();
  const ageMonths = completedAgeMonths(user.dob, date);
  const result = calculateBmi(input.height, input.weight, ageMonths, user.sex);
  await ref.update({ date: Timestamp.fromDate(date), expiresAt: Timestamp.fromDate(retentionExpiry(date)), height: Number(input.height), weight: Number(input.weight), ageMonths, ...result, updatedAt: FieldValue.serverTimestamp(), updatedBy: actor.uid });
  await audit(actor, "checkin.update", uid, { targetId: id, changedFields: ["date", "height", "weight", "bmi", "z", "classification"] });
  return json({ ok: true, ...result });
}

async function adminExport(request) {
  const actor = await verifyAdmin(request);
  const users = await db.collection("users").where("role", "==", "student").get();
  const rows = [];
  for (const userDoc of users.docs) {
    const checkins = await userDoc.ref.collection("checkins").orderBy("date", "desc").get();
    for (const checkin of checkins.docs.filter((doc) => withinRetentionWindow(doc.data().date))) rows.push({ uid: userDoc.id, lrn: userDoc.data().lrn, name: userDoc.data().name, ...checkin.data(), date: checkin.data().date?.toDate?.()?.toISOString?.() || null });
  }
  await audit(actor, "data.export", null, { changedFields: ["student-checkins"] });
  return json({ rows });
}

async function bootstrapAdmin(request) {
  const actor = await verifyUser(request);
  const expected = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").toLowerCase();
  if (!expected || actor.email?.toLowerCase() !== expected) {
    throw Object.assign(new Error("This account is not authorized for administrator bootstrap."), { status: 403 });
  }
  await adminAuth.setCustomUserClaims(actor.uid, { admin: true });
  await db.collection("users").doc(actor.uid).set({ role: "admin", status: "approved", email: actor.email, name: actor.name || "TsekAP Administrator", createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  return json({ ok: true, refreshToken: true });
}

function generateTemporaryPassword() {
  return `Ts!${crypto.randomBytes(6).toString("base64url")}7`;
}

async function cleanupExpiredCheckins(request) {
  const expected = process.env.CRON_SECRET;
  const supplied = request.headers.get("authorization");
  if (!expected || supplied !== `Bearer ${expected}`) {
    throw Object.assign(new Error("Maintenance authorization is required."), { status: 401 });
  }
  let deleted = 0;
  while (true) {
    const expired = await db.collectionGroup("checkins").where("expiresAt", "<=", Timestamp.now()).limit(400).get();
    if (expired.empty) break;
    const batch = db.batch();
    expired.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += expired.size;
    if (expired.size < 400) break;
  }
  await db.collection("auditLogs").add({ actorUid:"system", actorEmail:null, action:"retention.cleanup", targetUid:null, changedFields:["expired-checkins"], targetId:null, outcome:"success", note:`${deleted} expired check-in(s) removed`, createdAt:FieldValue.serverTimestamp() });
  return json({ ok:true, deleted });
}

async function deleteStudentData(uid, user) {
  const checkins = await db.collection("users").doc(uid).collection("checkins").get();
  for (let offset = 0; offset < checkins.docs.length; offset += 400) {
    const batch = db.batch();
    checkins.docs.slice(offset, offset + 400).forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  if (user.lrnHash) await db.collection("lrnIndex").doc(user.lrnHash).delete().catch(() => {});
  await db.collection("users").doc(uid).delete();
}

async function dispatch(request, method) {
  const path = route(request);
  if (method === "GET" && path === "cron/retention") return cleanupExpiredCheckins(request);
  if (method === "POST" && path === "auth/register") return register(request);
  if (method === "POST" && path === "auth/bootstrap-admin") return bootstrapAdmin(request);
  if (method === "GET" && path === "me") return me(request);
  if (method === "POST" && path === "checkins") return createCheckin(request);
  if (method === "POST" && path === "account/change-password") return changePassword(request);
  if (method === "DELETE" && path === "account") return deleteOwnAccount(request);
  if (method === "POST" && path === "migrations/local-profile") return importLocal(request);
  if (method === "GET" && path === "admin/students") return adminStudents(request);
  if (method === "GET" && path === "admin/audit") return adminAudit(request);
  if (method === "POST" && path === "admin/users") return adminCreateUser(request);
  if (method === "POST" && path === "admin/export") return adminExport(request);

  let match = path.match(/^admin\/users\/([^/]+)$/);
  if (match && method === "PATCH") return adminUpdateUser(request, match[1]);
  if (match && method === "DELETE") return adminDeleteUser(request, match[1]);
  match = path.match(/^admin\/users\/([^/]+)\/(approve|reject)$/);
  if (match && method === "POST") return adminStatus(request, match[1], match[2] === "approve" ? "approved" : "rejected");
  match = path.match(/^admin\/users\/([^/]+)\/reset-password$/);
  if (match && method === "POST") return adminResetPassword(request, match[1]);
  match = path.match(/^admin\/users\/([^/]+)\/disabled$/);
  if (match && method === "PATCH") return adminToggleDisabled(request, match[1]);
  match = path.match(/^admin\/users\/([^/]+)\/checkins$/);
  if (match && method === "GET") return adminCheckins(request, match[1]);
  match = path.match(/^admin\/users\/([^/]+)\/checkins\/([^/]+)$/);
  if (match && ["PATCH", "DELETE"].includes(method)) return adminMutateCheckin(request, match[1], match[2], method);
  return json({ error: "Not found." }, 404);
}

async function handle(request, method) {
  try {
    return await dispatch(request, method);
  } catch (error) {
    console.error("TsekAP API error", { route: route(request), method, code: error.code, message: error.message });
    const status = Number(error.status) || (error.code?.startsWith("auth/") ? 401 : 500);
    const message = status >= 500 ? "The service could not complete this request." : error.message;
    return json({ error: message }, status);
  }
}

export const GET = (request) => handle(request, "GET");
export const POST = (request) => handle(request, "POST");
export const PATCH = (request) => handle(request, "PATCH");
export const DELETE = (request) => handle(request, "DELETE");
