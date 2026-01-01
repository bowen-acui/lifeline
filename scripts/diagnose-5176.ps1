$ErrorActionPreference='Continue'

Write-Host '== LISTENERS 5176 =='
$ls = Get-NetTCPConnection -LocalPort 5176 -State Listen -ErrorAction SilentlyContinue
if ($ls) {
  foreach ($c in $ls) {
    $pid = $c.OwningProcess
    $name = '(unknown)'
    try { $name = (Get-Process -Id $pid).ProcessName } catch {}
    Write-Host "ListenAddress=$($c.LocalAddress) PID=$pid ($name)"
  }
} else {
  Write-Host '(no listener)'
}

Write-Host '== TCP =='
foreach ($h in @('localhost','127.0.0.1','::1')) {
  try {
    $t = Test-NetConnection -ComputerName $h -Port 5176
    Write-Host "$h -> $($t.TcpTestSucceeded)"
  } catch {
    Write-Host "$h -> ERR"
  }
}

Write-Host '== HTTP =='
foreach ($u in @('http://localhost:5176/','http://127.0.0.1:5176/','http://[::1]:5176/')) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3
    Write-Host "$u -> $($r.StatusCode)"
  } catch {
    Write-Host "$u -> ERR: $($_.Exception.Message)"
  }
}
