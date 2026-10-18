# Slate

A calm AI video workspace: take an idea, see its cost, and find your best take.

## Run locally

Use Node.js 22 or newer, then `npm install`, `npm run dev`, and open http://localhost:3000. Run `npm test` for three focused cost/job-state checks and `npm run build` for production validation. `npm start` serves the production build.

The startup scripts include a Windows-only compatibility preload: if asynchronous realpath returns EPERM, it retries the same path with the permitted synchronous API. Other errors propagate; other platforms are unchanged.

## What is kept, changed and cut

Kept: prompt-driven creation, camera choices, reusable recipes and visual iteration. Changed: one quiet composer and a personal library replace the reference product's broad discovery/navigation; exact costs and mock labels stay visible. Reference recon and three decisions are in recon/DECISIONS.md.

Cut: billing/subscriptions (session credits instead); auth/accounts (zero setup); Marketing/Ads studios, Canvas and Supercomputer/agent (outside the core prompt-to-take workflow); AI Influencer and Soul ID training (require identity/training infrastructure); community feed, contests and academy (discovery/education rather than creation); MCP/API (integration work outside this assignment). Batch generation, share links and advanced shortcuts are deferred to protect the main flow.

## Mock generation and providers

Every result is a **Mock render**, a procedural landscape seeded by the prompt. No paid API or external media is used. Ten camera choices include looping previews and alter motion; the mock does not semantically illustrate the prompt or reference image. Reference images are stored locally with recipes for a future provider.

GenerationProvider in src/lib/core.ts defines submit, getStatus and cancel. MockProvider simulates independent 8–25 second jobs with approximately 12% failures. Swift takes 8–13 seconds, Balanced 10–20 seconds, and Cinematic 15–25 seconds. Refresh resumes jobs from stored timestamps. Retry creates a new attempt with a parentId; remix prefills the recipe and links the next take. Completed jobs consume credits; active jobs reserve credits; failure/cancellation releases the reservation.

To swap providers, implement the interface and replace the provider construction in src/app/page.tsx. A real provider requiring secrets must use a server-side route and environment variables; never put a provider key in client code or public logs. A real async provider would require making submit/status asynchronous in both the interface and UI.

Playback is canvas-based. Download uses captureStream and MediaRecorder to create actual WebM, cached as a Blob in IndexedDB. Download is hidden when WebM recording is unsupported. Keep the tab visible during recording. Both Compare previews use one shared clock; short takes loop independently.

## AI tooling and capture

Codex desktop assisted implementation, debugging, styling and focused tests. .agent-logs/ is the intended public raw prompt/final-response record and is not ignored. Automatic capture passed in two fresh Codex sessions; see CAPTURE-TEST.md for the raw entries and earlier failures. Both used gpt-6.1-sol. Initial app work preceded verification under an explicit user override; those missing historical captures were not fabricated. The logs are committed, and .gitattributes prevents Git line-ending conversion for them.

## Known issues / next

Production build, browser checks and deployment evidence must be reported separately; do not infer them from implemented features. Lighthouse 90+ is not yet measured. Reference signup/screenshots, private-window deployed access, walkthrough and intro videos remain incomplete. IndexedDB is per-browser/device; unavailable storage shows an error. There is no server sync or real generation. The next priorities are browser verification, accessibility measurement, deployment, and the final walkthrough.

## Deployment

The intended host is Vercel. After signing into the intended account, run `npx vercel login`, then `npx vercel --prod` from this repo. No deployment is claimed until the returned live URL has been checked signed out. Use Node.js 22 or 24. Development uses .next/; production builds use .next-production/ so both can coexist.

## Capture scope

The passing canaries verify automatic logging for Codex sessions launched in this repo. This implementation chat is attached to a separate generated workspace, so repo-local hooks do not automatically capture its entire build history. Existing records are retained unchanged, and no missing historical transcript has been invented. This remains a submission limitation even though both canary tests pass.
