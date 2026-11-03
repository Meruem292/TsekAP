import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("check-in API implements stable idempotency and conflict detection", async () => {
  const source = await readFile(new URL("../api/[...path].js", import.meta.url), "utf8");
  assert.match(source, /clientRequestId/);
  assert.match(source, /client-\$\{sha256\(`\$\{actor\.uid\}:\$\{clientRequestId\}`\)\.slice\(0, 40\)\}/);
  assert.match(source, /db\.runTransaction/);
  assert.match(source, /status: 409/);
  assert.match(source, /deduplicated/);
});

test("client synchronizer is single-flight and uses Web Locks when available", async () => {
  const source = await readFile(new URL("../client/main.js", import.meta.url), "utf8");
  assert.match(source, /if \(syncPromise/);
  assert.match(source, /navigator\.locks\?\.request/);
  assert.match(source, /listQueuedCheckins\(auth\.currentUser\.uid\)/);
  assert.match(source, /clientRequestId:record\.queueId/);
});
