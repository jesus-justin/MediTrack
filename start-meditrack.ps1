$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$logDir = Join-Path $root 'logs'

if (-not (Test-Path $logDir)) {
  New-Item -Path $logDir -ItemType Directory | Out-Null
}

function Test-PortListening {
  param([int]$Port)

  try {
    return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop).Count -gt 0
  } catch {
    return $false
  }
}

function Wait-ForPort {
  param(
    [int]$Port,
    [int]$TimeoutSeconds,
    [string]$ServiceName
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      return $true
    }
    Start-Sleep -Seconds 2
  }

  Write-Host "$ServiceName did not become ready within $TimeoutSeconds seconds." -ForegroundColor Yellow
  return $false
}

function Start-BackendIfNeeded {
  if (Test-PortListening -Port 8080) {
    Write-Host 'Backend already running on port 8080.' -ForegroundColor Green
    return
  }

  $backendLog = Join-Path $logDir 'backend.log'
  $backendCommand = "Set-Location '$backendPath'; mvn spring-boot:run *>> '$backendLog'"
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', $backendCommand
  ) | Out-Null

  Write-Host 'Backend startup triggered.' -ForegroundColor Cyan
}

function Start-FrontendIfNeeded {
  if (Test-PortListening -Port 5173) {
    Write-Host 'Frontend already running on port 5173.' -ForegroundColor Green
    return
  }

  $frontendLog = Join-Path $logDir 'frontend.log'
  $frontendCommand = "Set-Location '$frontendPath'; if (-not (Test-Path 'node_modules')) { npm.cmd install *>> '$frontendLog' }; npm.cmd run dev -- --host 0.0.0.0 --port 5173 *>> '$frontendLog'"
  Start-Process powershell.exe -WindowStyle Hidden -ArgumentList @(
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', $frontendCommand
  ) | Out-Null

  Write-Host 'Frontend startup triggered.' -ForegroundColor Cyan
}

Write-Host 'Starting MediTrack services...' -ForegroundColor Cyan

$mysqlListening = Test-PortListening -Port 3306

if (-not $mysqlListening) {
  Write-Host 'Warning: MySQL is not listening on port 3306. Start MySQL (XAMPP) for full app functionality.' -ForegroundColor Yellow
}

Start-BackendIfNeeded
Start-FrontendIfNeeded

$backendReady = Wait-ForPort -Port 8080 -TimeoutSeconds 120 -ServiceName 'Backend'
$frontendReady = Wait-ForPort -Port 5173 -TimeoutSeconds 90 -ServiceName 'Frontend'

if ($backendReady -and $frontendReady) {
  Write-Host 'MediTrack is ready.' -ForegroundColor Green
} else {
  Write-Host "Startup incomplete. Check logs in: $logDir" -ForegroundColor Yellow
}

Write-Host 'Backend:  http://localhost:8080/api' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:5173' -ForegroundColor Green
Write-Host "Logs:     $logDir" -ForegroundColor DarkGray
