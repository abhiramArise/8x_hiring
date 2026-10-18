param([switch]$CheckOnly)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$codexCommand = Get-Command codex -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
$codexExecutable = $null
if ($codexCommand) { $codexExecutable = $codexCommand.Source }
if (-not $codexExecutable) {
    $bundledCodex = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
    $knownCodex = Join-Path $bundledCodex '896a0166b774037a\codex.exe'
    if (Test-Path -LiteralPath $knownCodex) { $codexExecutable = $knownCodex }
    elseif (Test-Path -LiteralPath $bundledCodex) {
        $candidate = Get-ChildItem -LiteralPath $bundledCodex -Filter codex.exe -File -Recurse |
            Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if ($candidate) { $codexExecutable = $candidate.FullName }
    }
}
if (-not $codexExecutable) { throw 'Cannot locate codex.exe on PATH or in the desktop bundle.' }
$pythonExecutable = Join-Path $env:USERPROFILE 'anaconda3\python.exe'
if (-not (Test-Path -LiteralPath $pythonExecutable)) {
    $pythonCommand = Get-Command python -CommandType Application -ErrorAction Stop | Select-Object -First 1
    $pythonExecutable = $pythonCommand.Source
}
Write-Host "Using Codex: $codexExecutable"
Write-Host 'Checking actual hook enablement and trust before starting any canary.'
$verifier = Join-Path $PSScriptRoot 'scripts\capture-canary.py'
if ($CheckOnly) {
    & $pythonExecutable $verifier --exe $codexExecutable --preflight
} else {
    # Two real sessions; the runtime hooks write the logs automatically.
    # The verifier never constructs or edits a capture entry.
    & $pythonExecutable $verifier --exe $codexExecutable
}
if ($LASTEXITCODE -ne 0) { throw 'Capture verification failed; inspect the reported reason. No passing result is claimed.' }
