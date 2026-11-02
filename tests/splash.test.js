import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const client = readFileSync(join(root, "client", "main.js"), "utf8");
const serviceWorker = readFileSync(join(root, "dist", "sw.js"), "utf8");
const videoPath = join(root, "dist", "assets", "recommendations", "video", "exercise-walking.mp4");
const stillPath = join(root, "dist", "assets", "recommendations", "exercise-walking.jpg");

test("shows a versioned first-visit splash with a five-second skip path", () => {
  assert.match(client, /tsekap\.splash\.seen\.v1/);
  assert.match(client, /if \(state\.splashVisible\) renderSplash\(\)/);
  assert.match(client, /id="splash-skip"/);
  assert.match(client, /video\.currentTime >= 5/);
  assert.match(client, /localStorage\.setItem\(SPLASH_SEEN_KEY, "true"\)/);
});

test("uses resilient video and reduced-motion still media", () => {
  assert.match(client, /exercise-walking\.mp4/);
  assert.match(client, /autoplay muted playsinline/);
  assert.match(client, /reducedMotion\.matches/);
  assert.match(client, /exercise-walking\.jpg/);
  assert.ok(existsSync(videoPath) && statSync(videoPath).size > 0);
  assert.ok(existsSync(stillPath) && statSync(stillPath).size > 0);
});

test("does not add the splash video to the service-worker shell", () => {
  const shell = serviceWorker.slice(0, serviceWorker.indexOf("self.addEventListener"));
  assert.doesNotMatch(shell, /exercise-walking\.mp4/);
});
