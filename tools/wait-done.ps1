# Watches a Herdr doer pane until its fixed reply line (e.g. "S1 DONE") appears, polling every $Every seconds.
# Use instead of `herdr agent wait --until idle`, whose status sometimes stays "working" (CLAUDE.md, Dispatch routine).
# Run it as a background command; it exits 0 when the line is found, 1 after $MaxMinutes.
#   .\tools\wait-done.ps1 -Agent sudoku -Marker "S1 DONE"
param([Parameter(Mandatory)][string]$Agent, [Parameter(Mandatory)][string]$Marker, [int]$Every = 30, [int]$MaxMinutes = 90)
$deadline = (Get-Date).AddMinutes($MaxMinutes)
while ((Get-Date) -lt $deadline) {
  $text = herdr agent read $Agent --source recent-unwrapped --lines 40 2>$null | Out-String
  # Anywhere in the tail: doers don't always print the marker alone on a line. The marker lives in the brief file, not in
  # the prompt, and recent-unwrapped only answers once the agent is idle, so a match means the doer has finished.
  if ($text -match [regex]::Escape($Marker)) { "found '$Marker' at $(Get-Date -Format HH:mm:ss)"; exit 0 }
  Start-Sleep -Seconds $Every
}
"timeout after $MaxMinutes min without '$Marker'"; exit 1
