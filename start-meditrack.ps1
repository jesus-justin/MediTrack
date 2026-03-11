$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $root 'backend'
$frontendPath = Join-Path $root 'frontend'

Write-Host 'Starting MediTrack services...' -ForegroundColor Cyan

$mysqlListening = $false
try {
  $mysqlListening = @(Get-NetTCPConnection -LocalPort 3306 -State Listen -ErrorAction Stop).Count -gt 0
} catch {
  $mysqlListening = $false
}

if (-not $mysqlListening) {
  Write-Host 'Warning: MySQL is not listening on port 3306. Start MySQL (XAMPP) for full app functionality.' -ForegroundColor Yellow
}

# Start backend in a dedicated PowerShell window.
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-Command', "Set-Location '$backendPath'; mvn spring-boot:run"
)

# Start frontend in a dedicated PowerShell window.
# npm.cmd avoids PowerShell execution policy issues on this machine.
Start-Process powershell -ArgumentList @(
  '-NoExit',
  '-ExecutionPolicy', 'Bypass',
  '-Command', "Set-Location '$frontendPath'; if (-not (Test-Path 'node_modules')) { npm.cmd install }; npm.cmd run dev -- --host 0.0.0.0 --port 5173"
)

Write-Host 'Backend:  http://localhost:8080/api' -ForegroundColor Green
Write-Host 'Frontend: http://localhost:5173' -ForegroundColor Green
Write-Host 'Two terminal windows were opened. Keep them running while using the app.' -ForegroundColor Yellow
