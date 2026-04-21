$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $root '.runtime'
New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null

function Start-IfMissing {
  param(
    [string]$Name,
    [int]$Port,
    [string[]]$ProcessArgs
  )

  $listening = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($listening) {
    Write-Output "$Name already running on :$Port (PID=$($listening.OwningProcess))"
    return
  }

  $stdout = Join-Path $runtimeDir "$Name.out.log"
  $stderr = Join-Path $runtimeDir "$Name.err.log"
  $pidFile = Join-Path $runtimeDir "$Name.pid"

  $proc = Start-Process -FilePath 'npm.cmd' -ArgumentList $ProcessArgs -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput $stdout -RedirectStandardError $stderr
  Set-Content -Path $pidFile -Value $proc.Id -Encoding utf8

  Start-Sleep -Seconds 2
  $check = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($check) {
    Write-Output "$Name started on :$Port (PID=$($check.OwningProcess))"
  } else {
    Write-Output "$Name failed to bind :$Port, check $stderr"
  }
}

Start-IfMissing -Name 'backend' -Port 3210 -ProcessArgs @('run', 'server')
Start-IfMissing -Name 'frontend' -Port 3010 -ProcessArgs @('run', 'dev', '--', '--port', '3010', '--host', '0.0.0.0')

Write-Output 'Dev stack ready:'
Write-Output '- Frontend: http://127.0.0.1:3010'
Write-Output '- Backend:  http://127.0.0.1:3210'
