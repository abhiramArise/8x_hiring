import test from "node:test";
import assert from "node:assert/strict";
import { estimateCost, jobStatus, availableCredits } from "../src/lib/core.ts";
test("cost changes with rate, duration and resolution", () => {
  assert.equal(estimateCost("swift", 4, "720p"), 8);
  assert.equal(estimateCost("cinematic", 8, "1080p"), 80);
});
test("job states progress independently and retain terminal outcomes", () => {
  assert.equal(jobStatus(1000, 10000, false, false).status, "queued");
  assert.equal(jobStatus(6000, 10000, false, false).status, "generating");
  assert.equal(jobStatus(12000, 10000, true, false).status, "failed");
  assert.equal(jobStatus(12000, 10000, false, true).status, "cancelled");
});
test("budget reserves active jobs and refunds failed attempts", () => {
  assert.equal(
    availableCredits(100, [
      { status: "done", costCredits: 20 },
      { status: "generating", costCredits: 10 },
      { status: "failed", costCredits: 40 },
    ]),
    70,
  );
});
