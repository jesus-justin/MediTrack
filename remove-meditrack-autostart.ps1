$ErrorActionPreference = 'Stop'

$taskName = 'MediTrack Auto Start'
$startupFolder = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
$startupCmd = Join-Path $startupFolder 'MediTrack Auto Start.cmd'

$removedAny = $false

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Scheduled task '$taskName' removed." -ForegroundColor Green
  $removedAny = $true
}

if (Test-Path $startupCmd) {
  Remove-Item -Path $startupCmd -Force
  Write-Host "Startup launcher '$startupCmd' removed." -ForegroundColor Green
  $removedAny = $true
}

if (-not $removedAny) {
  Write-Host 'No MediTrack auto-start configuration was found.' -ForegroundColor Yellow
}
