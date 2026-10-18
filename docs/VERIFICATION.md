# Verification

Verified 2026-10-19 against https://slate-workspace.vercel.app/.

Capture: PASS. Two fresh sessions wrote exact prompt/reply pairs automatically; CAPTURE-TEST.md contains raw evidence. Existing logs were not edited. Logs are tracked and excluded from Git line-ending conversion by .gitattributes.

## Product checks

- Three focused cost/state tests passed in the implementation block; production build and type check passed.
- Dependency audit: zero reported vulnerabilities after the PostCSS override.
- Independent review: portrait/square canvas dimensions, optional export cache, and named result dialog fixes applied.
- Vercel production deployment: live. First cloud build compiled but failed because Vercel expected .next. Project output was corrected to .next-production and the same source redeployed successfully. vercel.json records that setting for future deployments.
- Cookie-free HTTP request: 200, expected Slate heading and Mock render label. A literal private-window check remains outstanding.
- Live browser: three concurrent Swift jobs completed independently; refreshing during generation retained all three and their reservations.
- Costs: default Balanced/4s/720p = 12; Cinematic/8s/1080p = 80; Swift/4s/720p = 8, all observed in the live UI.
- Real WebM download: 1,012,553 bytes, EBML signature 1A-45-DF-A3, exported through the browser download flow.
- Remix: recipe prefilled; changed camera to Orbit; generated result retained Remixed from 102b87f6.
- Compare: two selected results opened together; Play in sync changed to Pause; Keeper selection persisted after reload and appeared in Keepers.
- Budget: reservations deducted immediately, cancellation released 8 credits without a charge; retry queued a replacement. At 240/240 credits used, generation disabled with an insufficient-credit message.
- Mobile Create: 390 x 844 viewport, document scrollWidth 375 <= innerWidth 390; controls and all ten presets visible without horizontal overflow.
- Random failure UI: not observed in this run (30 successful results plus one cancelled original). Failure state logic is covered by focused tests, but failed-job retry is not claimed browser-verified.
- Lighthouse: attempted against the live URL using headless Chrome; Chrome failed to expose its debugging port in this sandbox. No score is claimed.

## SPEC section 8

1. Public signed-out generation: live browser generation and cookie-free HTTP pass; literal private-window test remains.
2. Live costs: PASS for the combinations above, plus focused cost checks.
3. Three independent jobs: PASS. Cancellation/retry: PASS. Simulated failure/retry: browser verification outstanding.
4. Refresh persistence: PASS for in-flight queue and completed gallery.
5. Remix recipe/parent link: PASS.
6. Synchronized compare and persistent Keeper: PASS for equal-duration clips; mixed durations not manually verified.
7. Budget: PASS for reservation, cancellation release and exhaustion; failed-job release covered by logic test only.
8. README: PASS for positioning, kept/changed/cut, provider swap, AI capture scope and known limitations.
9. Lighthouse >=90: NOT VERIFIED; browser launch failed.

## Remaining submission work

Run a private-window generation and Lighthouse accessibility audit on a normal local browser. Observe a random failed take and retry it. Record the intro/walkthrough. Reference signup/screenshots were not completed. Historical build-chat capture gaps are disclosed in README; no records were fabricated.

## Build output

Development artifacts use .next/; production uses .next-production/. Windows startup preloads scripts/windows-path.cjs, retrying asynchronous realpath EPERM through the permitted synchronous API. Other errors propagate and other operating systems are unchanged.
