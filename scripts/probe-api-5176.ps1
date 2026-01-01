$ErrorActionPreference = 'Continue'

$base = 'http://localhost:5176'
$uri = "$base/api/analyze"

Write-Host "== GET $uri =="
try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 5 -Uri $uri -Method GET
  Write-Host "STATUS: $($r.StatusCode)"
  if ($r.Content) {
    Write-Host "BODY:"
    Write-Host $r.Content
  }
} catch {
  $resp = $_.Exception.Response
  if ($resp -and $resp.StatusCode) {
    Write-Host "STATUS: $([int]$resp.StatusCode)"
  } else {
    Write-Host "ERR: $($_.Exception.Message)"
  }
}

Write-Host "\n== POST $uri =="
$payload = @{
  userData = @{ name = 't'; gender = 'M'; date = '2020-01-01T00:00:00.000Z'; place = 'Beijing' }
  chartData = @{ bazi = @{}; ziwei = @{}; western = @{} }
} | ConvertTo-Json -Depth 10

try {
  $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 10 -Uri $uri -Method POST -ContentType "application/json" -Body $payload
  Write-Host "STATUS: $($r.StatusCode)"
  if ($r.Content) {
    Write-Host "BODY:"
    Write-Host $r.Content
  }
} catch {
  $resp = $_.Exception.Response
  if ($resp -and $resp.StatusCode) {
    Write-Host "STATUS: $([int]$resp.StatusCode)"
    try {
      $sr = New-Object System.IO.StreamReader($resp.GetResponseStream())
      $content = $sr.ReadToEnd()
      if ($content) {
        Write-Host "BODY:"
        Write-Host $content
      }
    } catch {}
  } else {
    Write-Host "ERR: $($_.Exception.Message)"
  }
}
