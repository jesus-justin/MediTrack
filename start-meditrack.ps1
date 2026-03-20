$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'
$logDir = Join-Path $root 'logs'
$backendUrl = 'http://localhost:8081/api'
$mysqlPort = 3306

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

function Get-PortOwnerSummary {
  param([int]$Port)

  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
    if (-not $connection) {
      return $null
    }

    $process = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
      return "$($process.ProcessName) (PID $($process.Id))"
    }

    return "PID $($connection.OwningProcess)"
  } catch {
    return $null
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

function Get-BackendRunnableJar {
  $targetDir = Join-Path $backendPath 'target'
  if (-not (Test-Path $targetDir)) {
    return $null
  }

  $jar = Get-ChildItem -Path $targetDir -Filter '*.jar' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch '\.original$' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

  if ($jar) {
    return $jar.FullName
  }

  return $null
}

function Test-BackendBuildRequired {
  param([string]$JarPath)

  if (-not $JarPath) {
    return $true
  }

  try {
    $jarTime = (Get-Item -Path $JarPath -ErrorAction Stop).LastWriteTime
  } catch {
    return $true
  }

  $pathsToCheck = @(
    (Join-Path $backendPath 'pom.xml'),
    (Join-Path $backendPath 'src\main')
  )

  foreach ($path in $pathsToCheck) {
    if (-not (Test-Path $path)) {
      continue
    }

    if ((Get-Item $path).PSIsContainer) {
      $newerFile = Get-ChildItem -Path $path -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -gt $jarTime } |
        Select-Object -First 1
      if ($newerFile) {
        return $true
      }
    } else {
      if ((Get-Item -Path $path -ErrorAction SilentlyContinue).LastWriteTime -gt $jarTime) {
        return $true
      }
    }
  }

  return $false
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

function Ensure-MySqlReady {
  param(
    [int]$TimeoutSeconds = 45
  )

  if (Test-PortListening -Port $mysqlPort) {
    return $true
  }

  $serviceFound = $false
  foreach ($serviceName in @('mysql', 'MySQL80', 'xamppmysql')) {
    try {
      $service = Get-Service -Name $serviceName -ErrorAction Stop
      $serviceFound = $true
      if ($service.Status -ne 'Running') {
        Start-Service -Name $serviceName -ErrorAction Stop
        Write-Host "Started MySQL service '$serviceName'." -ForegroundColor Cyan
      }
      break
    } catch {
      continue
    }
  }

  if (-not (Test-PortListening -Port $mysqlPort)) {
    if (-not $serviceFound) {
      Write-Host 'No MySQL Windows service found. Trying XAMPP MySQL fallback...' -ForegroundColor Yellow
    }

    $xamppRoot = 'C:\xampp'
    $mysqlStartBat = Join-Path $xamppRoot 'mysql_start.bat'
    $mysqldPath = Join-Path $xamppRoot 'mysql\bin\mysqld.exe'
    $myIniPath = Join-Path $xamppRoot 'mysql\bin\my.ini'

    if (Test-Path $mysqlStartBat) {
      Start-Process cmd.exe -WindowStyle Hidden -ArgumentList @(
        '/d',
        '/c',
        "`"$mysqlStartBat`""
      ) | Out-Null
      Start-Sleep -Seconds 2
    }

    if ((-not (Test-PortListening -Port $mysqlPort)) -and (Test-Path $mysqldPath) -and (Test-Path $myIniPath)) {
      Start-Process -FilePath $mysqldPath -WindowStyle Hidden -ArgumentList @(
        "--defaults-file=$myIniPath",
        '--standalone'
      ) | Out-Null
    }
  }

  return (Wait-ForPort -Port $mysqlPort -TimeoutSeconds $TimeoutSeconds -ServiceName 'MySQL')
}

function Start-BackendIfNeeded {
  if (Test-BackendHealthy) {
    Write-Host 'Backend already responding on http://localhost:8081/api.' -ForegroundColor Green
    return $true
  }

  if ((Test-PortListening -Port 8081) -and (-not (Test-BackendHealthy))) {
    $owner = Get-PortOwnerSummary -Port 8081
    if ($owner) {
      Write-Host "Port 8081 is already in use by $owner. Stop that process and start MediTrack again." -ForegroundColor Red
    } else {
      Write-Host 'Port 8081 is already in use by another process. Stop it and start MediTrack again.' -ForegroundColor Red
    }
    return $false
  }

  $javaHome = Resolve-Java21Home
  if (-not $javaHome) {
    Write-Host 'Java 21 was not found. Install or keep JDK 21 under C:\jdk or %USERPROFILE%\.jdk before starting MediTrack.' -ForegroundColor Red
    return $false
  }

  $backendLog = Join-Path $logDir 'backend.log'

  $jarPath = Get-BackendRunnableJar
  $needsBuild = Test-BackendBuildRequired -JarPath $jarPath
  if ($needsBuild) {
    if ($jarPath) {
      Write-Host 'Backend source changed since last package. Updating JAR (skip tests)...' -ForegroundColor Yellow
    } else {
      Write-Host 'Backend JAR not found. Building once with Maven (skip tests)...' -ForegroundColor Yellow
    }

    $buildCommand = @"
set "JAVA_HOME=$javaHome" && set "PATH=$javaHome\bin;%PATH%" && cd /d "$backendPath" && mvn -q -DskipTests package >> "$backendLog" 2>&1
"@.Trim()

    $buildExitCode = (Start-Process cmd.exe -ArgumentList @(
      '/d',
      '/c',
      $buildCommand
    ) -NoNewWindow -Wait -PassThru).ExitCode

    if ($buildExitCode -ne 0) {
      Write-Host "Backend build failed (exit code $buildExitCode). Check logs in: $backendLog" -ForegroundColor Red
      return $false
    }

    $jarPath = Get-BackendRunnableJar
  }

  if (-not $jarPath) {
    Write-Host "Backend JAR is still missing after build. Check logs in: $backendLog" -ForegroundColor Red
    return $false
  }

  $backendCommand = @"
set "JAVA_HOME=$javaHome" && set "PATH=$javaHome\bin;%PATH%" && cd /d "$backendPath" && java -jar "$jarPath" >> "$backendLog" 2>&1
"@.Trim()
  Start-Process cmd.exe -WindowStyle Hidden -ArgumentList @(
    '/d',
    '/c',
    $backendCommand
  ) | Out-Null

  Write-Host "Backend startup triggered from JAR: $jarPath" -ForegroundColor Cyan
  return $true
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

$mysqlReady = Ensure-MySqlReady -TimeoutSeconds 60
if (-not $mysqlReady) {
  Write-Host 'MySQL is still unavailable on port 3306. Startup will keep retrying backend until MySQL is ready.' -ForegroundColor Yellow
}

Start-BackendIfNeeded | Out-Null
Start-FrontendIfNeeded

$backendReady = $false
$backendDeadline = (Get-Date).AddMinutes(8)
$nextBackendAttempt = Get-Date
$backendAttempt = 0
while ((Get-Date) -lt $backendDeadline) {
  if (Test-BackendHealthy) {
    $backendReady = $true
    break
  }

  if ((Get-Date) -ge $nextBackendAttempt) {
    $backendAttempt += 1

    if (-not (Test-PortListening -Port $mysqlPort)) {
      Write-Host "MySQL not ready yet. Waiting before backend retry (attempt $backendAttempt)..." -ForegroundColor Yellow
      Ensure-MySqlReady -TimeoutSeconds 30 | Out-Null
    }

    if (-not (Test-PortListening -Port 8081)) {
      Start-BackendIfNeeded | Out-Null
    }

    $nextBackendAttempt = (Get-Date).AddSeconds(20)
  }

  Start-Sleep -Seconds 2
}

if (-not $backendReady) {
  Write-Host 'Backend did not become healthy within 8 minutes.' -ForegroundColor Yellow
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
