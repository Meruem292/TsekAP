const DB_NAME = "tsekap-offline-v1";
const DB_VERSION = 2;
const KEY_ID = "device-aes-gcm-v1";
const RETENTION_MS = 90 * 86400000;

let databasePromise;
let deviceKeyPromise;

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Offline storage request failed."));
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error || new Error("Offline storage transaction failed."));
    transaction.onabort = () => reject(transaction.error || new Error("Offline storage transaction was cancelled."));
  });
}

function openDatabase() {
  if (!globalThis.indexedDB) return Promise.reject(new Error("Offline storage is not supported by this browser."));
  if (!databasePromise) databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("keys")) database.createObjectStore("keys", { keyPath: "id" });
      if (!database.objectStoreNames.contains("profiles")) database.createObjectStore("profiles", { keyPath: "uid" });
      if (!database.objectStoreNames.contains("checkins")) {
        const store = database.createObjectStore("checkins", { keyPath: "queueId" });
        store.createIndex("uid", "uid", { unique: false });
        store.createIndex("uid_status", ["uid", "status"], { unique: false });
      } else {
        const store = request.transaction.objectStore("checkins");
        if (!store.indexNames.contains("uid_status")) store.createIndex("uid_status", ["uid", "status"], { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Offline storage could not be opened."));
    request.onblocked = () => reject(new Error("Offline storage is blocked by another tab."));
  });
  return databasePromise;
}

async function getRecord(storeName, key) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readonly");
  return requestResult(transaction.objectStore(storeName).get(key));
}

async function putRecord(storeName, value) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).put(value);
  await transactionDone(transaction);
  return value;
}

async function deleteRecord(storeName, key) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, "readwrite");
  transaction.objectStore(storeName).delete(key);
  await transactionDone(transaction);
}

async function createOrLoadDeviceKey() {
  const stored = await getRecord("keys", KEY_ID);
  if (stored?.key) return stored.key;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await putRecord("keys", { id: KEY_ID, key, createdAt: new Date().toISOString() });
  return key;
}

async function deviceKey() {
  if (!deviceKeyPromise) deviceKeyPromise = globalThis.navigator?.locks?.request
    ? globalThis.navigator.locks.request("tsekap-device-encryption-key", createOrLoadDeviceKey)
    : createOrLoadDeviceKey();
  try { return await deviceKeyPromise; }
  catch (error) { deviceKeyPromise = null; throw error; }
}

async function encrypt(value) {
  const key = await deviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { iv, cipher };
}

async function decrypt(record) {
  const key = await deviceKey();
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: record.iv }, key, record.cipher);
  return JSON.parse(new TextDecoder().decode(plaintext));
}

export async function cacheApprovedProfile(profile) {
  if (!profile?.uid || profile.role !== "student" || profile.status !== "approved") return;
  const encrypted = await encrypt({
    uid: profile.uid, role: profile.role, status: profile.status, name: profile.name,
    lrn: profile.lrn, dob: profile.dob, sex: profile.sex,
    conditions: profile.conditions || [], otherCondition: profile.otherCondition || "",
    mustChangePassword: Boolean(profile.mustChangePassword)
  });
  await putRecord("profiles", { uid: profile.uid, ...encrypted, updatedAt: new Date().toISOString() });
}

export async function loadCachedProfile(uid) {
  const record = uid ? await getRecord("profiles", uid) : null;
  return record ? decrypt(record) : null;
}

export async function enqueueCheckin(uid, input, queueId = crypto.randomUUID()) {
  if (!uid) throw new Error("A signed-in account is required for offline storage.");
  const measuredAt = new Date(input.date).toISOString();
  const encrypted = await encrypt({ height: Number(input.height), weight: Number(input.weight), date: measuredAt });
  const record = {
    queueId, uid, ...encrypted, status: "pending", attempts: 0,
    lastError: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  await putRecord("checkins", record);
  return { ...record, payload: await decrypt(record) };
}

export async function listQueuedCheckins(uid) {
  if (!uid) return [];
  const database = await openDatabase();
  const transaction = database.transaction("checkins", "readonly");
  const records = await requestResult(transaction.objectStore("checkins").index("uid").getAll(uid));
  const output = [];
  for (const record of records) {
    try { output.push({ ...record, payload: await decrypt(record) }); }
    catch { output.push({ ...record, status: "failed", lastError: "This encrypted entry could not be opened.", payload: null }); }
  }
  return output.sort((a, b) => new Date(a.payload?.date || a.createdAt) - new Date(b.payload?.date || b.createdAt));
}

export async function updateQueuedCheckin(queueId, changes) {
  const record = await getRecord("checkins", queueId);
  if (!record) return null;
  return putRecord("checkins", { ...record, ...changes, updatedAt: new Date().toISOString() });
}

export const removeQueuedCheckin = (queueId) => deleteRecord("checkins", queueId);

export async function purgeExpiredCheckins(uid, now = Date.now()) {
  const records = await listQueuedCheckins(uid);
  const expired = records.filter((record) => !record.payload || new Date(record.payload.date).getTime() < now - RETENTION_MS);
  await Promise.all(expired.map((record) => removeQueuedCheckin(record.queueId)));
  return expired.length;
}

export async function clearUserOfflineData(uid) {
  if (!uid) return;
  const records = await listQueuedCheckins(uid);
  await Promise.all(records.map((record) => removeQueuedCheckin(record.queueId)));
  await deleteRecord("profiles", uid);
}

export async function resetOfflineStoreForTests() {
  if (databasePromise) (await databasePromise).close();
  databasePromise = null;
  deviceKeyPromise = null;
  if (!globalThis.indexedDB) return;
  await requestResult(indexedDB.deleteDatabase(DB_NAME));
}
