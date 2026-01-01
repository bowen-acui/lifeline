$ErrorActionPreference='Continue'

$ports = @(5173,5174,5175,5176)
$seen = @{}

foreach ($p in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  foreach ($c in $conns) {
    $procId = $c.OwningProcess
    if ($seen.ContainsKey($procId)) { continue }
    $seen[$procId] = $true

    $procName = '(unknown)'
    $cmd = ''
    try { $procName = (Get-Process -Id $procId -ErrorAction Stop).ProcessName } catch {}
    try { $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$procId").CommandLine } catch {}

    Write-Host "PID=$procId Name=$procName"
    if ($cmd) { Write-Host "CMD=$cmd" }
    Write-Host '---'
  }
}
