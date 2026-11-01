import test from "node:test";
import assert from "node:assert/strict";
import { calculateBmi, completedAgeMonths } from "../server/bmi.js";

test("calculates the known illustrative female result", () => {
  const result = calculateBmi(162, 54.6, 196, "female");
  assert.equal(result.bmi.toFixed(1), "20.8");
  assert.equal(result.classification, "Within expected range");
  assert.ok(Math.abs(result.z) < 0.1);
});

test("rejects measurements outside the supported range", () => {
  assert.throws(() => calculateBmi(99, 54, 196, "female"), /100–220/);
});

test("uses completed age in months", () => {
  assert.equal(completedAgeMonths("2010-01-15", new Date("2026-05-14T00:00:00Z")), 195);
  assert.equal(completedAgeMonths("2010-01-15", new Date("2026-05-15T00:00:00Z")), 196);
});
