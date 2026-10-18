import test from "node:test";
import assert from "node:assert/strict";
const storage = await import("../src/lib/storage.ts").catch(() => ({}));
const core = await import("../src/lib/core.ts");

test("storage operations reject synchronous errors and stalled requests", async () => {
  assert.equal(
    typeof storage.withStorageTimeout,
    "function",
    "storage must have a bounded operation",
  );
  await assert.rejects(
    storage.withStorageTimeout(() => {
      throw new Error("denied");
    }, 20),
    /denied/,
  );
  await assert.rejects(
    storage.withStorageTimeout(() => new Promise(() => {}), 20),
    /timed out/,
  );
  assert.equal(
    await storage.withStorageTimeout(() => Promise.resolve("saved"), 20),
    "saved",
  );
});

test("reload marks active attempts interrupted and releases their reservations", () => {
  assert.equal(
    typeof core.restoreJobs,
    "function",
    "restore must recover interrupted jobs",
  );
  const provider = new core.MockProvider();
  const recipe = {
    prompt: "lake",
    modelId: "swift",
    durationSec: 4,
    resolution: "720p",
    aspect: "16:9",
    cameraPresetId: "push",
  };
  const queued = provider.submit(recipe);
  const done = { ...provider.submit(recipe), status: "done", isKeeper: true };
  const restored = core.restoreJobs([
    queued,
    { ...queued, id: "generating", status: "generating" },
    done,
  ]);
  assert.equal(restored[0].status, "failed");
  assert.match(restored[1].error, /interrupted/i);
  assert.equal(core.availableCredits(240, restored), 232);
  assert.equal(restored[2].isKeeper, true);
  assert.equal(queued.status, "queued");
  assert.throws(() => core.restoreJobs({ bad: "data" }), /saved takes/i);
});

test("retry makes a new linked attempt and failure status is independent", () => {
  const provider = new core.MockProvider();
  const recipe = {
    prompt: "lake",
    modelId: "swift",
    durationSec: 4,
    resolution: "720p",
    aspect: "16:9",
    cameraPresetId: "push",
  };
  const failed = { ...provider.submit(recipe), status: "failed" };
  const retry = provider.submit(failed.recipe, failed.id);
  assert.notEqual(retry.id, failed.id);
  assert.equal(retry.parentId, failed.id);
  assert.equal(failed.status, "failed");
  assert.equal(
    provider.getStatus({ ...retry, createdAt: 0, willFail: true }).status,
    "failed",
  );
});

test('demo reset exempts existing takes without changing their costs or history', () => {
  const jobs = [
    { id: 'kept', status: 'done', costCredits: 160, isKeeper: true },
    { id: 'running', status: 'generating', costCredits: 80 },
  ];
  const before = structuredClone(jobs);
  assert.equal(core.availableCredits(240, jobs), 0);
  const resetIds = jobs.map((job) => job.id);
  assert.equal(core.availableCredits(240, jobs, resetIds), 240);
  assert.deepEqual(jobs, before);
  const later = [...jobs, {id:'new',status:'done',costCredits:12}];
  assert.equal(core.availableCredits(240, later, resetIds), 228);
  assert.equal(core.availableCredits(240, [{...jobs[1],status:'failed'}], resetIds), 240);
});
