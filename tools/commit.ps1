# Commits staged work; the pre-commit hook runs the full gate. Retries only when the shell crashes at startup
# with add_item, a known issue on some setups; any other failure is real and stops.
#   .\tools\commit.ps1 -Message "Sudoku: ..." [-Trailer "Co-Authored-By: ..."] [-Paths a.ts, b.ts]
# Without -Paths it stages everything (git add -A); with -Paths it commits only those paths.
# Keep the message free of double quotes: some shells split them when passing arguments to git.
param([Parameter(Mandatory)][string]$Message, [string]$Trailer = '', [string[]]$Paths = @())
if ($Paths.Count -eq 0) { git add -A } else { git add -- @Paths }
$msgArgs = @('-m', $Message); if ($Trailer) { $msgArgs += @('-m', $Trailer) }
for ($i = 1; $i -le 6; $i++) {
  $out = if ($Paths.Count -eq 0) { git commit @msgArgs 2>&1 | Out-String } else { git commit @msgArgs -- @Paths 2>&1 | Out-String }
  $rc = $LASTEXITCODE
  "try $i rc=$rc"
  if ($rc -eq 0) { $out.Trim().Split("`n") | Where-Object { $_ -match '^\[main|Tests:' }; break }
  if ($out -notmatch 'add_item') { $out; break }
}
git status --short
