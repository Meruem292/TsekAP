import test from "node:test";
import assert from "node:assert/strict";
import { recommendationsFor } from "../shared/recommendations.js";

test("adapts guidance to BMI-for-age classification", () => {
  assert.match(recommendationsFor("Overweight")[0].body, /Avoid crash diets/);
});

test("adds an asthma action-plan reminder", () => {
  assert.ok(recommendationsFor("Within expected range", ["asthma"]).some((item) => /Asthma Action Plan/.test(item.body)));
});

test("keeps the recommendation set concise", () => {
  assert.ok(recommendationsFor("Obesity", ["asthma", "heart", "allergy", "private"]).length <= 4);
});
