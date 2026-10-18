# Deployed Slate end-to-end tests

The suite targets `https://slate-workspace.vercel.app/` by default. Set `E2E_BASE_URL` to target another deployment or a running local app. It does not start a web server or load `.env.local`.

Each Playwright test gets a new non-persistent browser context with empty cookies/storage. There is no saved sign-in state, storage seed or shared page. `Math.random` is stubbed before navigation: 0.5 for successful mock jobs, 0 in the forced-failure test. The retry test switches to 0.5 after checking the failure and refund. Generation completion assertions allow 40 seconds; test retries are disabled.

The budget test spends credits through Generate rather than editing storage. The comparison test uses two identical recipes so equal moving canvas frames demonstrate synchronization. IndexedDB denial and missing MediaRecorder are installed before app scripts run.

## PowerShell

From the repository root:

```powershell
cd D:\Games\8x_hiring
npm ci
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $PWD 'work\playwright-browsers'
npx playwright install chromium
npm run test:e2e
```

Optional base URL override (set it before running):

```powershell
$env:E2E_BASE_URL = 'https://slate-workspace.vercel.app/'
npm run test:e2e
```

List tests without running a browser:

```powershell
npm run test:e2e -- --list
```

Failure screenshots/traces, JSON results and the HTML report go under the already-ignored `work/playwright/`. Open the report with:

```powershell
npx playwright show-report .\work\playwright\report
```

A successful `--list` or type check is not a passing E2E run. Browser startup/network failures are infrastructure failures; report them separately from failed app assertions. The suite does not skip unsupported APIs: it explicitly asserts the fallback UI for the MediaRecorder removal test.
