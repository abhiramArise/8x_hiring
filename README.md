# Slate

**An AI video workspace for turning a prompt into a take, with the cost visible before you generate.**

Slate focuses on creating, reviewing and choosing clips in one calm workspace. Generation is **MOCKED**. Every result is labelled **Mock render**: it is a procedural canvas landscape, not AI-generated footage.

## Run locally

Use Node.js 22 or 24:

```powershell
npm ci
npm run dev
```

Open http://localhost:3000. `npm test` runs seven focused cost, job-state, retry and storage-recovery checks. `npm run build` creates the production build; `npm start` serves it. Development uses `.next/`; production uses `.next-production/`. `vercel.json` selects the production directory.

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

See [recon/](recon/) for six owner-taken reference screenshots and [product decisions](recon/DECISIONS.md). The owner signed up, used Higgsfield and captured these views on 19 Oct 2026; the onboarding and signed-in Image screenshots support that recon.

## How mock generation works

See [Architecture](docs/ARCHITECTURE.md) for the implemented browser modules and take lifecycle.

`GenerationProvider` in `src/lib/core.ts` defines `submit`, `getStatus` and `cancel`. The current interface is synchronous and returns the full local job. `MockProvider` creates independent jobs with an 8–25 second simulated delay, estimated progress and approximately 12% random failures. Reasons include overload, timeout and content filtering. No paid API, key or external media is required.

The prompt seeds landscape colors and terrain. Ten camera presets alter the motion. The mock does not semantically illustrate the prompt or use the reference image; the optional image is stored with the recipe.

Cost is model rate × duration × resolution multiplier: Swift 2, Balanced 3, Cinematic 5 credits/second; 720p is 1× and 1080p is 2×. Defaults are Balanced, 4 seconds, 16:9, 720p: **12 credits**. Aspect ratio does not change cost. The Generate button shows the total and disables when it exceeds the available budget.

Reset demo credits asks for confirmation and restores 240 credits without deleting takes or changing their original costs. Existing and running takes are exempt from the new demo budget; the reset is persisted with the take history.

Completed jobs consume credits. Queued/generating jobs reserve them; failed and cancelled jobs release the reservation. Retry creates a new ID linked to the previous attempt through `parentId`. Remix loads the recipe and links the next generated take to its parent. Compare uses one playback clock; shorter clips loop independently. Keeper is persisted with the job.

Jobs are saved in IndexedDB. On reopening, saved queued/generating attempts become failed with an **interrupted** reason and release their reservations. Completed takes remain. Storage operations have a four-second timeout; failed or unreadable storage leads to a visible **Session only** warning, with creation available in memory. A failed read does not trigger an empty overwrite of saved takes. An operating-system/browser failure can still prevent saving the most recent changes.

Preview uses canvas. Download records a real WebM using `captureStream` and `MediaRecorder`; the button is hidden when WebM recording is unsupported. Keep the tab visible during recording. IndexedDB export caching is optional and bounded, so cache errors do not discard a recorded clip.

### Swap the provider

Implement `GenerationProvider` and replace the provider construction in `src/app/page.tsx`. A real remote implementation will require asynchronous submit/status/cancel signatures and corresponding awaited UI calls. Put provider credentials in a server-side route and environment variables; never in browser code, public capture records or commits. A real provider is not implemented or verified.

## AI tooling and capture

Codex desktop assisted implementation, debugging, styling and focused tests. `.agent-logs/` contains the existing automatic prompt/response records and is tracked, not ignored. `CAPTURE-TEST.md` contains evidence for two independent canary sessions and the earlier failed attempts.

**Earlier build chats, and the audit and UX-fix Codex sessions after the canary sessions, ran outside this repository and were not captured by its hooks.** The existing canaries verify those sessions, not the complete build history. No missing transcript has been backfilled. During this audit, `.agent-logs/` and `.codex/` were read only and left unchanged. Raw quoted canary evidence in `CAPTURE-TEST.md` matched the actual files.

## Owner-reported Lighthouse accessibility audits

The owner ran automated Lighthouse accessibility audits on the live Create screen at https://slate-workspace.vercel.app/ on **19 Oct 2026**. These are **the owner's runs, not Codex's runs**.

| Owner's run | Accessibility score | Reported result |
| --- | --- | --- |
| Before the contrast fix | 0.96 (96) | Color-contrast was the only failing audit: two elements measured 3.68:1 and 4.16:1 against the required 4.5:1. |
| After commit `0247c78` was deployed | 1.0 (100) | No failing audits. |

These automated Lighthouse accessibility results do not establish full accessibility compliance. Manual private-window and phone checks remain **UNVERIFIED**.

## Codex-executed live E2E results

Codex ran the FULL, unchanged Playwright suite against **https://slate-workspace.vercel.app/** with `E2E_BASE_URL=https://slate-workspace.vercel.app/` after the owner reported commit `9cb33e5` deployed. Run started **2026-10-19T08:18:53.046Z (UTC; 19 Oct 2026 in Asia/Calcutta)** and took **184.590 seconds**. Result: **11 passed, 0 failed, 0 skipped, 0 flaky; exit code 0**. Runtime: **Playwright 1.64.1, Node v24.19.0, Chromium 156.0.8078.4**.

Executed command: `node node_modules/playwright/cli.js test --config tests/e2e/playwright.config.ts`. Dependencies were run from the clean verification copy at `C:\Users\DELL\Documents\Codex\2026-10-18\codex-build-prompt-send-this-as\work\slate-credit-final` because dependency installation in the repo previously failed with EPERM. The spec, fixtures, config and package lock were verified byte-for-byte identical to the repo. No app or test assertions were changed. The target was the live URL, not a local server. Machine-readable evidence is in that copy's ignored `work/playwright/results.json`.

| Executed scenario | Result |
| --- | --- |
| 01 Fresh signed-out context: 240 credits and Generate 12 credits | PASS |
| 02 Generate a take within 40 seconds | PASS |
| 03 Forced failure: visible reason, refund and linked Retry | PASS |
| 04 Refresh persistence and interrupted-job recovery | PASS |
| 05 Spend to zero, disabled reason, confirmed credit reset and retained takes | PASS |
| 06 Remix prefill and readable parent navigation | PASS |
| 07 Synchronized Compare and persisted Keeper | PASS |
| 08 Dialog centering, Tab/Shift+Tab containment, Esc and focus return | PASS |
| 09 Automated 390px viewport: no horizontal overflow, labels >=11px, targets >=44px | PASS |
| 10 Blocked IndexedDB: Session only warning and creation | PASS |
| 11 MediaRecorder unavailable: preview works, Download hidden | PASS |

Each test used a fresh browser context with empty storage and no authentication. Math.random was stubbed for deterministic normal/failure paths. These are automated Chromium results, not manual private-window acceptance or physical mobile-device testing. **Manual private-window and mobile checks remain UNVERIFIED.** The automated 390px checks above were actually executed. Mixed-duration Compare, actual WebM file download, reduced motion and missing-parent handling are not established by these scenarios. The owner-reported Lighthouse audits are recorded above. Codex's earlier Lighthouse attempt failed to launch Chrome and produced no report or score.

## Verification and known issues

The owner confirms that the app audit, UX fixes, wording and mobile credit-label fixes through commit `9cb33e5` are deployed at https://slate-workspace.vercel.app/. Deployment confirmation does not establish browser acceptance results.

`docs/AUDIT.md` records the audit and `docs/VERIFICATION.md` records exact check coverage. Automated checks cover costs, independent state transitions, failure refunds, linked retry, storage rejection/timeout and interrupted recovery. These checks do not substitute for browser tests.

Apart from the owner-reported automated Lighthouse audits above, no current manual browser acceptance results were supplied. Codex-executed live E2E coverage is recorded separately above.

| Current manual check | Status |
| --- | --- |
| Signed-out/private-window generation | UNVERIFIED |
| Exact costs, breakdown and insufficient-credit reason | UNVERIFIED |
| Reset demo credits: confirmation, retained takes and persistence | UNVERIFIED |
| Parent take navigation and missing-parent handling | UNVERIFIED |
| Take dialog: Esc, focus return, focus containment and centering | UNVERIFIED |
| Mobile Create at 390px | UNVERIFIED |
| Independent jobs, failed-job reason/retry and interruption recovery | UNVERIFIED |
| Queue/gallery refresh persistence and Remix | UNVERIFIED |
| Compare synchronization and Keeper persistence | UNVERIFIED |
| Budget charge/refund behavior | UNVERIFIED |
| Unavailable-storage loading/error path | UNVERIFIED |
| WebM download and unsupported-recording fallback | UNVERIFIED |
| Keyboard navigation and reduced motion | UNVERIFIED |
| Automated Lighthouse accessibility on live Create | Owner-reported PASS: 1.0 (100) after `0247c78`, 19 Oct 2026; see audit scope above |

- Browser storage is per origin, browser and device. There is no account sync or multi-tab coordination. Budget is a local demonstration, not billing enforcement.
- The reference image is not used by the mock, and mock output is a landscape rather than semantic video generation.
- Historical capture gaps remain. Six owner-taken recon screenshots are included in [recon/](recon/). Walkthrough and intro videos remain **UNVERIFIED**: no completion confirmation or video links were supplied.

## What I would build next

First, finish private-window, unavailable-storage and accessibility verification on a normal browser. Then add multi-tab storage coordination and a real asynchronous provider behind a server route, once keys and spending approval are supplied. Cloud sync and sharing would follow validated demand for the core workflow.
