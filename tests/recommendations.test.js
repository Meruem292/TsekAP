import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  BMI_CLASSIFICATIONS, RECOMMENDATION_CATALOG, SUPPORTED_CONDITIONS,
  recommendationPreview, recommendationsFor, wellnessPlanFor
} from "../shared/recommendations.js";

const assetRoot = join(process.cwd(), "dist", "assets", "recommendations");

test("contains the complete exercise and food catalogs", () => {
  assert.equal(RECOMMENDATION_CATALOG.exercise.length, 14);
  assert.equal(RECOMMENDATION_CATALOG.food.length, 12);
  assert.ok(RECOMMENDATION_CATALOG.exercise.some((item) => item.id === "jumping-jacks"));
  assert.ok(RECOMMENDATION_CATALOG.exercise.some((item) => item.id === "modified-pushups"));
  assert.ok(RECOMMENDATION_CATALOG.exercise.some((item) => item.id === "light-resistance"));
  assert.ok(RECOMMENDATION_CATALOG.exercise.some((item) => item.id === "jogging"));
});

test("returns at least three movement and food options for every BMI and condition", () => {
  for (const classification of BMI_CLASSIFICATIONS) {
    for (const condition of SUPPORTED_CONDITIONS) {
      const plan = wellnessPlanFor(classification, [condition]);
      assert.ok(plan.exercise.length >= 3, `${classification} + ${condition} exercise coverage`);
      assert.ok(plan.food.length >= 3, `${classification} + ${condition} food coverage`);
    }
  }
});

test("combined conditions use the safe intersection", () => {
  const plan = wellnessPlanFor("Overweight", ["heart", "hypertension", "arthritis", "injury", "private"]);
  assert.ok(plan.exercise.length >= 3);
  assert.ok(plan.exercise.every((item) => !item.excludedConditions.some((condition) => ["heart", "hypertension", "arthritis", "injury", "private"].includes(condition))));
  assert.ok(plan.exercise.some((item) => item.id === "comfortable-walking"));
  assert.ok(plan.exercise.some((item) => item.id === "warmup-mobility"));
});

test("does not offer high-impact or weight-lifting activities to restricted profiles", () => {
  for (const condition of ["heart", "hypertension"]) {
    const ids = wellnessPlanFor("Within expected range", [condition]).exercise.map((item) => item.id);
    assert.ok(!ids.includes("light-resistance"));
    assert.ok(!ids.includes("jumping-jacks"));
    assert.ok(!ids.includes("jump-rope"));
  }
  for (const condition of ["arthritis", "injury"]) {
    const plan = wellnessPlanFor("Within expected range", [condition]);
    assert.ok(plan.exercise.every((item) => item.impact !== "High impact"));
    assert.ok(!plan.exercise.some((item) => ["jogging", "walk-jog"].includes(item.id)));
  }
});

test("adds condition-specific asthma, diabetes, and epilepsy safety", () => {
  const asthma = wellnessPlanFor("Within expected range", ["asthma"]);
  assert.match(`${asthma.exercise.map((item) => item.safety).join(" ")} ${asthma.cautions.join(" ")}`, /Asthma Action Plan/);
  const diabetes = wellnessPlanFor("Within expected range", ["diabetes"]);
  assert.match(diabetes.cautions.join(" "), /glucose-monitoring/i);
  const epilepsy = wellnessPlanFor("Within expected range", ["epilepsy"]);
  assert.match(epilepsy.cautions.join(" "), /buddy/i);
  assert.match(epilepsy.exercise.find((item) => item.id === "swimming")?.safety || "", /one-to-one supervision/i);
});

test("prioritizes allergy and celiac safety while retaining useful food choices", () => {
  const allergy = wellnessPlanFor("Within expected range", ["allergy"]);
  assert.equal(allergy.food[0].id, "allergy-aware");
  assert.ok(allergy.food.every((item) => !item.excludedConditions.includes("allergy")));
  const combined = wellnessPlanFor("Within expected range", ["allergy", "celiac"]);
  assert.ok(combined.food.some((item) => item.id === "gluten-free-filipino"));
  assert.ok(combined.food.some((item) => item.id === "allergy-aware"));
  assert.ok(combined.food.length >= 3);
});

test("keeps severe-thinness and obesity guidance non-restrictive", () => {
  const severe = wellnessPlanFor("Severe thinness");
  assert.match(severe.cautions.join(" "), /Do not use exercise to compensate for food/i);
  assert.ok(!severe.exercise.some((item) => ["jumping-jacks", "jogging", "jump-rope"].includes(item.id)));
  const obesity = wellnessPlanFor("Obesity");
  assert.match(obesity.cautions.join(" "), /Avoid fasting, crash diets, shame/i);
  assert.ok(obesity.food.every((item) => !/weight loss|calorie restriction/i.test(`${item.body} ${item.why}`)));
});

test("legacy concise recommendation interface stays compatible", () => {
  const concise = recommendationsFor("Overweight", ["asthma"]);
  assert.equal(concise.length, 4);
  assert.equal(concise.filter((item) => item.kind === "exercise").length, 2);
  assert.equal(concise.filter((item) => item.kind === "food").length, 2);
});

test("dashboard preview shows three cards before expanding", () => {
  const plan = wellnessPlanFor("Within expected range");
  const collapsed = recommendationPreview(plan.exercise, false);
  const expanded = recommendationPreview(plan.exercise, true);
  assert.equal(collapsed.visible.length, 3);
  assert.equal(collapsed.remaining, plan.exercise.length - 3);
  assert.equal(expanded.visible.length, plan.exercise.length);
});

test("uses five-second videos, reduced-motion stills, and lazy media caching", () => {
  const client = readFileSync(join(process.cwd(), "client", "main.js"), "utf8");
  const serviceWorker = readFileSync(join(process.cwd(), "dist", "sw.js"), "utf8");
  assert.match(client, /prefers-reduced-motion: reduce/);
  assert.match(client, /<video class="recommendation-video" autoplay muted loop playsinline/);
  assert.doesNotMatch(client, /\.gif/);
  const shell = serviceWorker.slice(0, serviceWorker.indexOf("self.addEventListener"));
  assert.doesNotMatch(shell, /assets\/recommendations/);
  assert.match(serviceWorker, /cache\.put\(event\.request/);
});

test("every catalog entry has complete metadata and generated media", () => {
  for (const [kind, entries] of Object.entries(RECOMMENDATION_CATALOG)) {
    for (const item of entries) {
      for (const key of ["id", "title", "asset", "category", "body", "why", "safety", "source", "href"]) {
        assert.ok(item[key], `${kind}:${item.id} is missing ${key}`);
      }
      const still = join(assetRoot, `${item.asset}.jpg`);
      assert.ok(existsSync(still), `missing ${still}`);
      assert.ok(statSync(still).size > 0, `empty ${still}`);
      const video = join(assetRoot, "video", `${item.asset}.mp4`);
      assert.ok(existsSync(video), `missing ${video}`);
      assert.ok(statSync(video).size > 0, `empty ${video}`);
    }
  }
});
