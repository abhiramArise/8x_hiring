# Slate

**An AI video workspace for turning a prompt into a take, with the cost visible before you generate.**

Slate focuses on creating, reviewing and choosing clips in one calm workspace. Generation is **MOCKED**. Every result is labelled **Mock render**: it is a procedural canvas landscape, not AI-generated footage.

## Run locally

Use Node.js 22 or 24:

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. `npm test` runs six focused cost, job-state, retry and storage-recovery checks. `npm run build` creates the production build; `npm start` serves it. Development uses `.next/`; production uses `.next-production/`. `vercel.json` selects the production directory.

The Windows startup preload retries asynchronous `realpath` EPERM using the synchronous API for the same path. Other errors propagate; other operating systems are unchanged.

## Kept, changed and cut

| Decision | Reason |
| --- | --- |
| Kept prompt creation, optional reference images, models and camera presets | These define the core recipe for a take. |
| Kept gallery, reusable recipes, remix and comparison | Iteration and choosing a result are the product's main loop. |
| Changed broad discovery/navigation into one composer and a personal library | Keeps the assignment focused and reduces choices before the first generation. |
| Changed billing into a visible 240-credit browser budget | Makes costs and failure refunds testable without payments. |
| Cut billing/subscriptions and auth/accounts | No payment infrastructure or sign-in is needed to try the mock. |
| Cut Marketing/Ads studios, Canvas and Supercomputer/agent | Separate workflows would dilute the prompt-to-take experience. |
| Cut AI Influencer and Soul ID training | Identity and model-training infrastructure are outside the scope. |
| Cut community, contests and academy | Discovery and education are outside the creation loop. |
| Cut MCP/API integrations | Integrations do not establish the core experience. |
| Deferred batch, share links and advanced shortcuts | Prioritized the queue, recovery and reviewing takes. Ctrl/Cmd+Enter generation is available. |

Reference decisions are in `recon/DECISIONS.md`. Reference signup and screenshots were not completed; no claim of full reference recon is made.

## How mock generation works

`GenerationProvider` in `src/lib/core.ts` defines `submit`, `getStatus` and `cancel`. The current interface is synchronous and returns the full local job. `MockProvider` creates independent jobs with an 8–25 second simulated delay, estimated progress and approximately 12% random failures. Reasons include overload, timeout and content filtering. No paid API, key or external media is required.

The prompt seeds landscape colors and terrain. Ten camera presets alter the motion. The mock does not semantically illustrate the prompt or use the reference image; the optional image is stored with the recipe.

Cost is model rate × duration × resolution multiplier: Swift 2, Balanced 3, Cinematic 5 credits/second; 720p is 1× and 1080p is 2×. Defaults are Balanced, 4 seconds, 16:9, 720p: **12 credits**. Aspect ratio does not change cost. The Generate button shows the total and disables when it exceeds the available budget.

Completed jobs consume credits. Queued/generating jobs reserve them; failed and cancelled jobs release the reservation. Retry creates a new ID linked to the previous attempt through `parentId`. Remix loads the recipe and links the next generated take to its parent. Compare uses one playback clock; shorter clips loop independently. Keeper is persisted with the job.

Jobs are saved in IndexedDB. On reopening, saved queued/generating attempts become failed with an **interrupted** reason and release their reservations. Completed takes remain. Storage operations have a four-second timeout; failed or unreadable storage leads to a visible **Session only** warning, with creation available in memory. A failed read does not trigger an empty overwrite of saved takes. An operating-system/browser failure can still prevent saving the most recent changes.

Preview uses canvas. Download records a real WebM using `captureStream` and `MediaRecorder`; the button is hidden when WebM recording is unsupported. Keep the tab visible during recording. IndexedDB export caching is optional and bounded, so cache errors do not discard a recorded clip.

### Swap the provider

Implement `GenerationProvider` and replace the provider construction in `src/app/page.tsx`. A real remote implementation will require asynchronous submit/status/cancel signatures and corresponding awaited UI calls. Put provider credentials in a server-side route and environment variables; never in browser code, public capture records or commits. A real provider is not implemented or verified.

## AI tooling and capture

Codex desktop assisted implementation, debugging, styling and focused tests. `.agent-logs/` contains the existing automatic prompt/response records and is tracked, not ignored. `CAPTURE-TEST.md` contains evidence for two independent canary sessions and the earlier failed attempts.

**Earlier chats ran outside this repository and were not captured by its hooks.** The existing canaries verify those sessions, not the complete build history. No missing transcript has been backfilled. During this audit, `.agent-logs/` and `.codex/` were read only and left unchanged. Raw quoted canary evidence in `CAPTURE-TEST.md` matched the actual files.

## Verification and known issues

The public deployment is https://slate-workspace.vercel.app/. It was deployed from the earlier implementation; the audit fixes require a new deployment. Do not assume the current public app includes the latest local fixes.

`docs/AUDIT.md` records the audit and `docs/VERIFICATION.md` records exact check coverage. Automated checks cover costs, independent state transitions, failure refunds, linked retry, storage rejection/timeout and interrupted recovery. These checks do not substitute for browser tests.

- Local Next production startup reports Ready, but this sandbox's browser cannot reach its localhost port. Updated UI behavior is not browser-verified here.
- Earlier live checks verified generation, WebM export, queue/gallery refresh, remix parent, equal-duration compare, Keeper, mobile width, cancellation and budget exhaustion. These apply to the earlier deployment.
- A literal signed-out private-window generation, failed-job retry in the browser, unavailable-storage UI, unsupported-recording UI, mixed-duration comparison and a complete keyboard/reduced-motion pass remain unverified for the updated build.
- Lighthouse could not launch Chrome in this sandbox; an accessibility score of 90 or higher is not claimed.
- Browser storage is per origin, browser and device. There is no account sync or multi-tab coordination. Budget is a local demonstration, not billing enforcement.
- The reference image is not used by the mock, and mock output is a landscape rather than semantic video generation.
- Historical capture gaps remain. Reference screenshots, intro video and walkthrough are not complete.

## What I would build next

First, finish private-window, unavailable-storage and accessibility verification on a normal browser. Then add multi-tab storage coordination and a real asynchronous provider behind a server route, once keys and spending approval are supplied. Cloud sync and sharing would follow validated demand for the core workflow.
