# SPEC: "Slate" (a Higgsfield-inspired AI video workspace)

Reference product: higgsfield.ai. This is inspiration, not a copy. Own name, own layout, own decisions.

## 1. Goal and positioning

Higgsfield has 20+ surfaces and a steep learning curve. Slate does one thing well: take a prompt, show what it will cost, generate, and help the user pick the best take.

Core promise: no surprises (cost shown before you generate, honest job states) and easy iteration (compare, remix).

## 2. Scope

### Build (in priority order)
1. Create screen: prompt box, optional reference image, model picker, camera preset picker, duration/aspect settings, live cost estimate on the Generate button.
2. Job queue with honest states: queued, generating (with progress estimate), done, failed (with reason), cancelled. One-click retry.
3. Gallery/history of all generations, persisted across refresh.
4. Result view: playback, download, "Recipe" panel (prompt, model, camera, settings), Remix button that loads the recipe back into Create.
5. Compare view: pick two takes from the gallery, play side by side in sync, keep one (mark as "Keeper").
6. Session budget: a visible credit budget that decreases as jobs complete. Replaces billing.

### Cut (say so in README)
Billing and subscriptions, auth and accounts, Marketing/Ads studios, Canvas, Supercomputer/agent, AI Influencer, Soul ID training, community feed, contests, academy, MCP/API.

### Stretch (only if time remains)
- Batch: run the same prompt across 2 camera presets at once and land in Compare automatically.
- Keyboard shortcuts (Cmd+Enter to generate, C to compare).
- Shareable read-only result link.

## 3. Generation approach

Interface first. Define `GenerationProvider` with `submit(request) -> jobId`, `getStatus(jobId)`, `cancel(jobId)`.

- `MockProvider` (default): simulates a queue, variable delay (8 to 25 s), realistic progress, ~12% random failures with specific reasons ("content filter", "model overloaded", "timeout"). The output is a procedurally generated animated clip (canvas, seeded from the prompt and camera preset) so no external assets or keys are needed. Label every mock result "Mock render" in the UI and README.
- `RealProvider` (optional): behind an env var, only if an API key is available. Must not be required for the app to run.

Job state lives client-side (IndexedDB or localStorage) so a refresh keeps the queue. If a job was "generating" when the page closed, resume it or mark it failed with "interrupted" on next load.

## 4. Models and cost

Fixed catalog of 3 fictional-neutral models (e.g. "Swift", "Balanced", "Cinematic") with different cost per second and speed. Cost estimate = model rate x duration x resolution multiplier. The Generate button always shows the total, and it updates live as settings change. If cost exceeds remaining budget, the button disables and says why.

## 5. Camera presets

8 to 10 presets, each with a plain-language one-line description and a small looping preview: Slow push in ("adds tension"), Pull back reveal, Orbit, Pan left, Pan right, Tilt up, Handheld, Static, Crane up, Whip pan.

Preset affects the prompt sent to the provider and the mock motion.

## 6. Data model

- Generation: id, createdAt, status, progress, error, recipe, costCredits, resultUrl or renderParams, isKeeper, parentId (set when remixed).
- Recipe: prompt, modelId, cameraPresetId, durationSec, aspect, resolution, referenceImage (optional, stored as data URL).
- Budget: totalCredits, spentCredits (derived from completed jobs; failed jobs are refunded).

## 7. UX requirements

- Dark, calm, minimal. Not a copy of the original layout.
- Create screen works on mobile width. Compare may require tablet or desktop and should say so gracefully.
- Every list has a designed empty state. Every async action has loading, success and failure states.
- Failed job shows the reason in plain words and a Retry button. Retry creates a new attempt linked to the old one.
- No dead buttons. If something is cut, it is not in the UI.
- Accessible: keyboard navigable, focus states, labelled controls, reduced-motion respected.

## 8. Acceptance criteria

1. A signed-out visitor opens the live link and can generate a clip without any setup.
2. The Generate button shows the exact cost and it changes with model, duration and resolution.
3. Starting 3 jobs shows 3 independent job cards with different states. Failures appear and Retry works.
4. Refreshing the page keeps the gallery and any in-flight jobs.
5. Remix from a result pre-fills Create with that recipe and links the new result to its parent.
6. Compare plays two takes side by side in sync; marking a Keeper persists.
7. Budget decreases on completion and refunds on failure.
8. README lists cuts and the reason for each decision, and states clearly that generation is mocked (or real).
9. Lighthouse accessibility score of 90 or higher on the Create screen.

## 9. Suggested stack

Next.js (App Router) + TypeScript + Tailwind, client-side state with Zustand or similar, IndexedDB via idb-keyval. Deploy on Vercel from day one. No backend required.

## 10. Time budget (24h window, aim for ~14h of work)

| Block | Output |
|---|---|
| 0:00 to 0:30 | Capture hook verified, repo public, `CAPTURE-TEST.md` committed, empty app deployed |
| 0:30 to 1:30 | Recon: sign up on higgsfield.ai, screenshots into `/recon`, write 3 product decisions |
| 1:30 to 5:00 | Vertical slice: Create, mock provider, queue, gallery, result view |
| 5:00 to 9:00 | Cost estimate, camera presets, failures and retry, budget |
| 9:00 to 12:00 | Remix and Compare |
| 12:00 to 14:00 | Polish, empty states, a11y, mobile pass, deploy check signed out |
| 14:00 to 16:00 | README, walkthrough (5 min max, camera on), 1 min intro video |

## 11. README must include

- What Slate is and the one-line positioning.
- What was kept from the reference, what was changed, what was cut, and why.
- How generation works (mock vs real) and how to swap the provider.
- How AI tooling was used, and a pointer to `.agent-logs/`.
- Known issues and what would come next.
