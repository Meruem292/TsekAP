import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const client = readFileSync(join(root, "client", "main.js"), "utf8");
const styles = readFileSync(join(root, "dist", "styles.css"), "utf8");
const serviceWorker = readFileSync(join(root, "dist", "sw.js"), "utf8");
const videoPath = join(root, "dist", "assets", "recommendations", "video", "exercise-walking.mp4");
const stillPath = join(root, "dist", "assets", "recommendations", "exercise-walking.jpg");

test("shows the landing splash with a five-second skip path", () => {
  assert.match(client, /if \(state\.splashVisible\) renderSplash\(\)/);
  assert.match(client, /id="splash-skip"/);
  assert.match(client, /video\.currentTime >= 5/);
  assert.doesNotMatch(client, /SPLASH_SEEN_KEY/);
});

test("replays the splash whenever an in-app path returns to the landing page", () => {
  assert.match(client, /function prepareLandingSplash\(\)/);
  assert.match(client, /state\.publicStep = "welcome"/);
  assert.match(client, /state\.splashVisible = true/);
  assert.match(client, /#disclaimer-back"\)\.addEventListener\("click", showLandingSplash\)/);
  assert.match(client, /#offline-back"\)\.addEventListener\("click", showLandingSplash\)/);
  assert.match(client, /#auth-home"\)\.addEventListener\("click", showLandingSplash\)/);
});

test("uses a scoped upward splash exit with fallbacks", () => {
  assert.match(client, /function transitionFromSplash\(\)/);
  assert.match(client, /classList\.add\("splash-exit-transition"\)/);
  assert.match(client, /document\.startViewTransition\(renderSplashDestination\)/);
  assert.match(client, /translateY\(-100%\)/);
  assert.match(client, /if \(reducedMotion\.matches\)/);
  assert.match(styles, /html\.splash-exit-transition::view-transition-old\(root\)/);
  assert.match(styles, /html\.splash-exit-transition::view-transition-new\(root\)/);
  assert.match(styles, /@keyframes splash-scroll-away/);
  assert.match(styles, /@keyframes splash-scroll-arrive/);
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
