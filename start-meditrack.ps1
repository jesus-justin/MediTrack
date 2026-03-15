$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$logDir = Join-Path $root 'logs'
$backendUrl = 'http://localhost:8081/api'

if (-not (Test-Path $logDir)) {
  New-Item -Path $logDir -ItemType Directory | Out-Null
}

function Resolve-Java21Home {
  $candidateRoots = @(
    'C:\jdk',
    (Join-Path $env:USERPROFILE '.jdk'),
    'C:\Program Files\Eclipse Adoptium'
  )

  foreach ($candidateRoot in $candidateRoots) {
    if (-not (Test-Path $candidateRoot)) {
      continue
    }

    $match = Get-ChildItem -Path $candidateRoot -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -like 'jdk-21*' } |
      Sort-Object Name -Descending |
      Select-Object -First 1

    if ($match) {
      return $match.FullName
    }
  }

  return $null
}

function Test-PortListening {
  param([int]$Port)

  try {
    return @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop).Count -gt 0
  } catch {
    return $false
  }
}

function Test-BackendHealthy {
  try {
    $response = Invoke-RestMethod -Method Get -Uri "$backendUrl/health" -TimeoutSec 5 -ErrorAction Stop
    return $response.status -eq 'UP'
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
  if (Test-BackendHealthy) {
    Write-Host 'Backend already responding on http://localhost:8081/api.' -ForegroundColor Green
    return
  }

  $javaHome = Resolve-Java21Home
  if (-not $javaHome) {
    Write-Host 'Java 21 was not found. Install or keep JDK 21 under C:\jdk or %USERPROFILE%\.jdk before starting MediTrack.' -ForegroundColor Red
    return
  }

  $backendLog = Join-Path $logDir 'backend.log'
  $backendCommand = @"
set "JAVA_HOME=$javaHome" && set "PATH=$javaHome\bin;%PATH%" && cd /d "$backendPath" && mvn spring-boot:run >> "$backendLog" 2>&1
"@.Trim()
  Start-Process cmd.exe -WindowStyle Hidden -ArgumentList @(
    '/d',
    '/c',
    $backendCommand
  ) | Out-Null

  Write-Host "Backend startup triggered with JAVA_HOME=$javaHome." -ForegroundColor Cyan
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

$backendReady = $false
$backendDeadline = (Get-Date).AddSeconds(120)
while ((Get-Date) -lt $backendDeadline) {
  if (Test-BackendHealthy) {
    $backendReady = $true
    break
  }
  Start-Sleep -Seconds 2
}

if (-not $backendReady) {
  Write-Host 'Backend did not become healthy within 120 seconds.' -ForegroundColor Yellow
}

$frontendReady = Wait-ForPort -Port 5173 -TimeoutSeconds 90 -ServiceName 'Frontend'

if ($backendReady -and $frontendReady) {
  Write-Host 'MediTrack is ready.' -ForegroundColor Green
} else {
  Write-Host "Startup incomplete. Check logs in: $logDir" -ForegroundColor Yellow
}

Write-Host 'Backend:  http://localhost:8081/api' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:5173' -ForegroundColor Green
Write-Host "Logs:     $logDir" -ForegroundColor DarkGray
