$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$startupScript = Join-Path $root 'start-meditrack.ps1'
$taskName = 'MediTrack Auto Start'
$startupFolder = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
$startupCmd = Join-Path $startupFolder 'MediTrack Auto Start.cmd'
$taskInstalled = $false

if (-not (Test-Path $startupScript)) {
  throw "Startup script not found: $startupScript"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"$startupScript\""
$trigger = New-ScheduledTaskTrigger -AtLogOn -RandomDelay (New-TimeSpan -Seconds 30)
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 2) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

try {
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description 'Auto-start MediTrack backend/frontend at user logon.' -Force | Out-Null
  $taskInstalled = $true

  Write-Host "Scheduled task '$taskName' installed." -ForegroundColor Green
} catch {
  $taskError = $_.Exception.Message
  Write-Host "Scheduled-task registration failed: $taskError" -ForegroundColor Yellow

  $taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$startupScript`""
  schtasks.exe /Create /TN "$taskName" /TR "$taskCommand" /SC ONLOGON /DELAY 0000:30 /F | Out-Null
  if ($LASTEXITCODE -eq 0) {
    $taskInstalled = $true
    Write-Host "Scheduled task '$taskName' installed via schtasks.exe." -ForegroundColor Green
  } else {
    Write-Host 'schtasks.exe fallback failed; using Startup-folder auto-start.' -ForegroundColor Yellow
  }
}

if (-not (Test-Path $startupFolder)) {
  New-Item -Path $startupFolder -ItemType Directory | Out-Null
}

$cmdContent = @"
@echo off
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$startupScript"
"@.Trim()

Set-Content -Path $startupCmd -Value $cmdContent -Encoding ASCII

if ($taskInstalled) {
  Write-Host "Startup launcher refreshed at: $startupCmd" -ForegroundColor Green
  Write-Host 'MediTrack auto-start redundancy enabled (scheduled task + startup launcher).' -ForegroundColor Green
} else {
  Write-Host "Startup launcher created at: $startupCmd" -ForegroundColor Green
  Write-Host 'MediTrack will now auto-start after every sign-in.' -ForegroundColor Green
}

Write-Host "To remove it later, run: ./remove-meditrack-autostart.ps1" -ForegroundColor DarkGray
