$ErrorActionPreference='Continue'

$ports = @(5173,5174,5175)
Write-Host '== LISTENERS =='
foreach ($p in $ports) {
  $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
  if (-not $conns) {
    Write-Host "Port ${p}: (no listener)"
    continue
  }
  foreach ($c in $conns) {
    $pid = $c.OwningProcess
    $procName = '(unknown)'
    try { $procName = (Get-Process -Id $pid -ErrorAction Stop).ProcessName } catch {}
    Write-Host "Port ${p}: ListenAddress=$($c.LocalAddress) PID=$pid ($procName)"
  }
}

Write-Host '== QUICK HTTP =='
foreach ($u in @('http://127.0.0.1:5173/','http://127.0.0.1:5174/','http://127.0.0.1:5175/')) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 2
    Write-Host "$u -> $($r.StatusCode)"
  } catch {
    Write-Host "$u -> ERR"
  }
}
