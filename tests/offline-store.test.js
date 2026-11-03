import "fake-indexeddb/auto";
import test from "node:test";
import assert from "node:assert/strict";
import {
  cacheApprovedProfile, clearUserOfflineData, enqueueCheckin, listQueuedCheckins,
  loadCachedProfile, purgeExpiredCheckins, removeQueuedCheckin,
  resetOfflineStoreForTests, updateQueuedCheckin
} from "../client/offline-store.js";

const profile = (uid) => ({
  uid, role: "student", status: "approved", name: "Test Student", lrn: "123456789012",
  dob: "2009-04-03", sex: "female", conditions: ["asthma"], otherCondition: ""
});

test.beforeEach(resetOfflineStoreForTests);
test.after(resetOfflineStoreForTests);

test("approved profiles round-trip and remain isolated by Firebase UID", async () => {
  await cacheApprovedProfile(profile("student-a"));
  assert.deepEqual(await loadCachedProfile("student-a"), { ...profile("student-a"), mustChangePassword: false });
  assert.equal(await loadCachedProfile("student-b"), null);
});

test("queued measurements round-trip without plaintext health values in IndexedDB", async () => {
  const input = { height: 163.7, weight: 57.4, date: "2026-11-03T01:02:03.000Z" };
  await enqueueCheckin("student-a", input, "request_1234567890");
  const [queued] = await listQueuedCheckins("student-a");
  assert.deepEqual(queued.payload, input);
  assert.equal(queued.status, "pending");

  const raw = await new Promise((resolve, reject) => {
    const open = indexedDB.open("tsekap-offline-v1");
    open.onsuccess = () => {
      const request = open.result.transaction("checkins").objectStore("checkins").get("request_1234567890");
      request.onsuccess = () => { const value = request.result; open.result.close(); resolve(value); };
      request.onerror = () => reject(request.error);
    };
    open.onerror = () => reject(open.error);
  });
  const serialized = JSON.stringify(raw);
  assert.equal(serialized.includes("163.7"), false);
  assert.equal(serialized.includes("57.4"), false);
});

test("queue status updates, removal, and account clearing affect only the owner", async () => {
  await cacheApprovedProfile(profile("student-a"));
  await cacheApprovedProfile(profile("student-b"));
  await enqueueCheckin("student-a", { height: 160, weight: 50, date: new Date().toISOString() }, "request_student_a");
  await enqueueCheckin("student-b", { height: 170, weight: 60, date: new Date().toISOString() }, "request_student_b");
  await updateQueuedCheckin("request_student_a", { status: "failed", lastError: "Needs approval" });
  assert.equal((await listQueuedCheckins("student-a"))[0].status, "failed");
  await clearUserOfflineData("student-a");
  assert.equal((await listQueuedCheckins("student-a")).length, 0);
  assert.equal(await loadCachedProfile("student-a"), null);
  assert.equal((await listQueuedCheckins("student-b")).length, 1);
  await removeQueuedCheckin("request_student_b");
  assert.equal((await listQueuedCheckins("student-b")).length, 0);
});

test("check-ins older than 90 days are purged", async () => {
  await enqueueCheckin("student-a", { height: 160, weight: 50, date: "2026-01-01T00:00:00.000Z" }, "request_expired_01");
  const removed = await purgeExpiredCheckins("student-a", new Date("2026-11-03T00:00:00.000Z").getTime());
  assert.equal(removed, 1);
  assert.equal((await listQueuedCheckins("student-a")).length, 0);
});
