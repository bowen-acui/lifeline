$ErrorActionPreference = 'Continue'

Write-Host '== Test-NetConnection =='
foreach ($hostName in @('localhost','127.0.0.1','::1')) {
  try {
    $t = Test-NetConnection -ComputerName $hostName -Port 5174
    $obj = [PSCustomObject]@{ Host = $hostName; Port = 5174; TcpTestSucceeded = $t.TcpTestSucceeded }
    $obj | Format-Table -AutoSize | Out-String | Write-Host
  } catch {
    Write-Host "${hostName}: $($_.Exception.Message)"
  }
}

Write-Host '== HTTP =='
foreach ($u in @('http://localhost:5174/','http://127.0.0.1:5174/','http://[::1]:5174/')) {
  try {
    $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 3
    Write-Host "$u -> $($r.StatusCode)"
  } catch {
    Write-Host "$u -> ERR: $($_.Exception.Message)"
  }
}
