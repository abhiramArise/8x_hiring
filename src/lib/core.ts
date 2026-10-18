export type Status = "queued" | "generating" | "done" | "failed" | "cancelled";
export type Recipe = {
  prompt: string;
  modelId: string;
  cameraPresetId: string;
  durationSec: number;
  aspect: string;
  resolution: string;
  referenceImage?: string;
};
export type Generation = {
  id: string;
  createdAt: number;
  status: Status;
  progress: number;
  error?: string;
  recipe: Recipe;
  costCredits: number;
  isKeeper: boolean;
  parentId?: string;
  delay: number;
  willFail: boolean;
  renderPrompt: string;
};
export const models = [
  { id: "swift", name: "Swift", rate: 2, note: "Fast ideas, light footprint" },
  {
    id: "balanced",
    name: "Balanced",
    rate: 3,
    note: "A little more room to explore",
  },
  {
    id: "cinematic",
    name: "Cinematic",
    rate: 5,
    note: "For the take you want to keep",
  },
];
export const presets = [
  {
    id: "push",
    name: "Slow push in",
    description: "Move closer. Add tension.",
  },
  {
    id: "pull",
    name: "Pull back reveal",
    description: "Let the wider story unfold.",
  },
  { id: "orbit", name: "Orbit", description: "Circle around your subject." },
  {
    id: "left",
    name: "Pan left",
    description: "Follow the scene to the left.",
  },
  { id: "right", name: "Pan right", description: "Let the frame drift right." },
  { id: "tilt", name: "Tilt up", description: "Find a new perspective above." },
  {
    id: "handheld",
    name: "Handheld",
    description: "A human, imperfect rhythm.",
  },
  {
    id: "static",
    name: "Static",
    description: "Hold still. Let the scene speak.",
  },
  { id: "crane", name: "Crane up", description: "Rise above the ordinary." },
  { id: "whip", name: "Whip pan", description: "A quick burst of movement." },
];
export function estimateCost(
  model: string,
  duration: number,
  resolution: string,
) {
  return (
    Math.round(
      (models.find((m) => m.id === model)?.rate ?? 2) *
        duration *
        (resolution === "1080p" ? 2 : 1) *
        100,
    ) / 100
  );
}
export function availableCredits(
  total: number,
  jobs: { status: string; costCredits: number }[],
) {
  return (
    total -
    jobs
      .filter((j) => ["done", "queued", "generating"].includes(j.status))
      .reduce((s, j) => s + j.costCredits, 0)
  );
}
export function jobStatus(
  elapsed: number,
  delay: number,
  fail: boolean,
  cancelled: boolean,
): { status: Status; progress: number } {
  if (cancelled) return { status: "cancelled", progress: 0 };
  if (elapsed < 2000) return { status: "queued", progress: 0 };
  if (elapsed < delay)
    return {
      status: "generating",
      progress: Math.min(
        95,
        Math.round(((elapsed - 2000) / (delay - 2000)) * 95),
      ),
    };
  return { status: fail ? "failed" : "done", progress: fail ? 0 : 100 };
}
export interface GenerationProvider {
  submit(recipe: Recipe, parentId?: string): Generation;
  getStatus(job: Generation): { status: Status; progress: number };
  cancel(job: Generation): Generation;
}
export class MockProvider implements GenerationProvider {
  submit(recipe: Recipe, parentId?: string): Generation {
    return {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      status: "queued",
      progress: 0,
      recipe: { ...recipe },
      costCredits: estimateCost(
        recipe.modelId,
        recipe.durationSec,
        recipe.resolution,
      ),
      isKeeper: false,
      parentId,
      delay:
        recipe.modelId === "swift"
          ? 8000 + Math.random() * 5000
          : recipe.modelId === "cinematic"
            ? 15000 + Math.random() * 10000
            : 10000 + Math.random() * 10000,
      willFail: Math.random() < 0.12,
      renderPrompt:
        recipe.prompt +
        " Camera: " +
        presets.find((p) => p.id === recipe.cameraPresetId)?.name,
    };
  }
  getStatus(job: Generation) {
    return jobStatus(
      Date.now() - job.createdAt,
      job.delay,
      job.willFail,
      job.status === "cancelled",
    );
  }
  cancel(job: Generation): Generation {
    return { ...job, status: "cancelled", progress: 0 };
  }
}
