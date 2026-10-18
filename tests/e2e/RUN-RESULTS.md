# Deployed E2E run results

Target: https://slate-workspace.vercel.app/
Browser: Playwright Chromium 156.0.8078.4, Playwright 1.64.1.

These are executed results, not a claim that the full final suite is green.

## Runs

1. Full suite: **9 passed, 2 failed, 0 skipped**, 220.1 seconds; started 2026-10-18T20:06:06.398Z.
2. After correcting test 04's ambiguous reason selector and adding focus diagnostics/continued checks to test 08: affected tests 04 and 08 rerun, **1 passed, 1 failed, 0 skipped**, 53.4 seconds; started 2026-10-18T20:11:43.206Z.

No app code was changed. There were no automatic test retries. The original failure artifacts are retained under work/playwright/initial-run/ with initial-results.json; the latest report contains the two-test rerun.

## Scenario outcomes across executed runs

| Test | Outcome |
| --- | --- |
| 01 first load: signed-out empty workspace has 240 credits and Generate 12 credits | PASS, full run |
| 02 generate: a queued take finishes within 40 seconds | PASS, full run |
| 03 failure: visible reason, refund and a linked successful Retry | PASS, full run |
| 04 refresh: finished takes persist and an in-flight take fails as interrupted | PASS, affected-test rerun |
| 05 budget: spend to zero, explain disabled Generate, confirm reset and retain takes | PASS, full run |
| 06 remix: recipe prefills and the new take opens its readable parent | PASS, full run |
| 07 compare: synchronized moving frames and a Keeper survives refresh | PASS, full run |
| 08 dialog: centered at three sizes, contains keyboard focus, Esc restores opener | FAIL in both runs; focus containment fails |
| 09 mobile 390px: no horizontal scroll, preset labels >=11px and touch targets >=44px | PASS, full run |
| 10 blocked IndexedDB: Session only warning appears and generation still works | PASS, full run |
| 11 no MediaRecorder: take preview works and Download is hidden | PASS, full run |

## Failure details

Test 04 initially used getByText(/interrupted/i), which matched both the prompt heading and the actual interruption reason. This was a test-selector bug. The final selector requires the exact full interruption reason; the assertions were not weakened. The rerun passed, including retained finished take, interruption reason, enabled Retry and refunded balance.

Test 08 remains failing. Shift+Tab from Close did not wrap to the last dialog control (Download WebM). The attached diagnostic recorded documentFocused=false, active tag=BODY, insideDialog=false. During subsequent Tab navigation, focus also escaped the dialog and document.

Its centering checks passed at 1440x900, 768x1024 and 390x844. On the rerun, soft focus assertions still failed the test but allowed independent Escape and focus-return assertions to execute; both passed. Close was explicitly focused before Escape so the Escape check did not depend on the broken containment behavior. The focus requirements and failing assertions remain intact.

## Other checks and environment

- TypeScript --noEmit --incremental false: PASS.
- Existing unit suite: 7 PASS.
- Test discovery: 11 tests.
- No E2E assertion was skipped or relaxed to make the suite green.
- App code, .agent-logs/ and .codex/ were unchanged.
- Initial browser installation to the repo work directory failed with async realpath EPERM. Installation succeeded using the existing Windows compatibility preload and a browser cache in the Documents workspace. The executed tests used Node 24 and the same preload; no app code or browser security flags were changed for this.

PowerShell installation/run commands are in README.md in this directory. A full final suite rerun after the selector correction was not performed; the affected tests were rerun explicitly.
