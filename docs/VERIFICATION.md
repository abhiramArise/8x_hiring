# Verification — audit revision, 2026-10-19

## Automated/local checks

- PASS: six focused tests (cost, job transitions, budget failure release, synchronous/rejected/stalled storage, interrupted recovery, linked retry). The two new recovery checks failed before their implementation and passed afterwards.
- PASS: TypeScript check with --noEmit --incremental false.
- PASS: production build completed with static Create route and 114 kB initial JavaScript.
- Local production startup: reported Ready at localhost:3001. Browser access timed out and separate-process HTTP failed; no local interactive pass is claimed.
- PASS: in-process production HTTP check on Node 24.19.0 returned 200, expected heading, the new result empty state, and no extra logo letter. The same check on Node 25 returned 200 then hit a Windows shutdown assertion; the Node 24 run exited cleanly.
- Protected files: all nine files in .agent-logs/ and .codex/ retain their baseline SHA-256 hashes, with no additions or removals. CAPTURE-TEST.md is unchanged. Read only. CAPTURE-TEST.md raw excerpts match actual logs; no capture record was created or changed.

## SPEC section 8

| # | Status | Evidence and limits |
| --- | --- | --- |
| 1 | NOT VERIFIED fully | Earlier live browser generation and cookie-free HTTP 200; no literal private-window generation. Audit fixes not redeployed. |
| 2 | PASS for cost logic/earlier live UI | Tests verify rate, duration and multiplier. Earlier live UI showed Balanced/4s/720p 12, Swift/4s/720p 8, Cinematic/8s/1080p 80. Current default selects remain explicit. Updated build UI not manually checked. |
| 3 | NOT VERIFIED fully | Earlier three concurrent jobs/cancel/retry observed. Tests cover failure state and linked retry. Random failure with reason/retry not browser-verified. |
| 4 | PASS in recovery tests; current UI NOT VERIFIED | Earlier deployed queue/gallery refresh passed. New restore test preserves completed/Keeper jobs and converts active ones to failed interrupted, as requested. |
| 5 | PASS on earlier deployment | Prefilled recipe and parent 102b87f6 observed; updated parent label not browser-verified. |
| 6 | PASS for earlier equal-duration comparison | Play in sync and Keeper persistence observed. Mixed durations/current build not manually verified. |
| 7 | PASS in logic tests | Failure and interruption release reserved credits. Earlier UI cancellation release/exhaustion passed. Random failure refund UI unverified. |
| 8 | PASS | README covers positioning, decisions/reasons, mock/provider swap, AI capture limitations and known issues. |
| 9 | NOT VERIFIED | Lighthouse Chrome launch failed in the earlier attempt; no 90+ score is claimed. |

## Requested UI checks

- Logo: source letter replaced with film icon; browser confirmation pending.
- Storage unavailable/stalled: bounded logic tested; visual error/session-only transition pending.
- Empty result: designed fallback present in source; visual check pending.
- Defaults/multiplier: present and previously observed; unchanged arithmetic.
- Independent queued/generating/done/failed/cancelled: state tests; previous UI covered all except random failure.
- Interrupted: new restore test verifies failed reason, refund and terminal preservation.
- Download: previous live WebM 1,012,553 bytes with EBML signature 1A-45-DF-A3. Unsupported button guard inspected; unsupported browser not exercised.
- Mobile: previous live 390 x 844 check found scrollWidth 375 <= innerWidth 390. Updated layout not manually verified.
- Keyboard/focus/reduced motion: labelled native controls, focus-visible CSS and reduced-motion CSS/canvas guards inspected. Complete interactive pass not performed; no accessibility score inferred.

## Manual work remaining

Deploy this revision. On a normal local browser verify private-window generation, storage disabled/unavailable, interrupted/retry path, unsupported recording, mixed-duration comparison and keyboard/reduced motion. Run Lighthouse accessibility on Create and fix any findings until >=90. Record the required intro and walkthrough. Earlier capture gaps cannot be reconstructed honestly.
