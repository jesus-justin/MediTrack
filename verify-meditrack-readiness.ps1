$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScript = Join-Path $root 'start-meditrack.ps1'
$backendHealthUrl = 'http://localhost:8081/api/health'
$frontendUrl = 'http://localhost:5173/'
$loginUrl = 'http://localhost:8081/api/auth/login'

function Test-PortListening {
  param([int]$Port)

  try {
    return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop).Count -gt 0
  } catch {
    return $false
  }
}

function Test-BackendHealth {
  try {
    $resp = Invoke-RestMethod -Method Get -Uri $backendHealthUrl -TimeoutSec 3 -ErrorAction Stop
    return $resp.status -eq 'UP'
  } catch {
    return $false
  }
}

function Get-SystemStatus {
  [PSCustomObject]@{
    MySql = Test-PortListening -Port 3306
    BackendPort = Test-PortListening -Port 8081
    FrontendPort = Test-PortListening -Port 5173
    BackendHealth = Test-BackendHealth
  }
}

function Is-Ready {
  param($Status)

  return $Status.MySql -and $Status.BackendPort -and $Status.FrontendPort -and $Status.BackendHealth
}

Write-Host 'Checking MediTrack readiness...' -ForegroundColor Cyan
$status = Get-SystemStatus

if (-not (Is-Ready -Status $status)) {
  Write-Host 'Services not fully ready. Triggering startup script...' -ForegroundColor Yellow
  if (-not (Test-Path $startScript)) {
    throw "Startup script missing: $startScript"
  }

  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-File', $startScript
  ) | Out-Null

  $deadline = (Get-Date).AddMinutes(4)
  while ((Get-Date) -lt $deadline) {
    $status = Get-SystemStatus
    if (Is-Ready -Status $status) {
      break
    }
    Start-Sleep -Milliseconds 750
  }
}

$status = Get-SystemStatus

Write-Host ''
Write-Host 'Current status:' -ForegroundColor Cyan
$status | Format-List | Out-String | Write-Host

if (-not (Is-Ready -Status $status)) {
  Write-Host 'MediTrack is NOT ready yet.' -ForegroundColor Red
  Write-Host 'Check logs in ./logs and then rerun this script.' -ForegroundColor Yellow
  exit 1
}

Write-Host 'MediTrack is ready.' -ForegroundColor Green

$loginBody = @{ username = 'admin'; password = 'Admin@123' } | ConvertTo-Json
$loginTimer = [System.Diagnostics.Stopwatch]::StartNew()
$loginResp = Invoke-RestMethod -Method Post -Uri $loginUrl -ContentType 'application/json' -Body $loginBody -TimeoutSec 8 -ErrorAction Stop
$loginTimer.Stop()

Write-Host ('Login probe: success in {0} ms (role: {1})' -f [math]::Round($loginTimer.Elapsed.TotalMilliseconds, 0), $loginResp.role) -ForegroundColor Green
Write-Host ("Frontend: $frontendUrl") -ForegroundColor Green
Write-Host ("Backend:  $backendHealthUrl") -ForegroundColor Green
