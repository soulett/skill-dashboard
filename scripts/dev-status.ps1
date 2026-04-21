$ErrorActionPreference = 'Stop'

function Show-Port {
  param([string]$Name, [int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($conn) {
    Write-Output "$Name :$Port UP (PID=$($conn.OwningProcess))"
  } else {
    Write-Output "$Name :$Port DOWN"
  }
}

Show-Port -Name 'frontend' -Port 3010
Show-Port -Name 'backend' -Port 3210
