$ErrorActionPreference = 'Stop'

$ports = @(3010, 3210)
foreach ($port in $ports) {
  $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force
    Write-Output "Stopped process on :$port (PID=$($conn.OwningProcess))"
  } else {
    Write-Output "No process listening on :$port"
  }
}
