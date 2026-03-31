$ErrorActionPreference = 'Stop'

$taskName = 'MediTrack Auto Start'
$startupFolder = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\Startup'
$startupCmd = Join-Path $startupFolder 'MediTrack Auto Start.cmd'
$startupLnk = Join-Path $startupFolder 'MediTrack.lnk'
$runKey = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run'
$runValueName = 'MediTrack AutoStart'

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

if (Test-Path $startupLnk) {
  Remove-Item -Path $startupLnk -Force
  Write-Host "Startup shortcut '$startupLnk' removed." -ForegroundColor Green
  $removedAny = $true
}

if ($null -ne (Get-ItemProperty -Path $runKey -Name $runValueName -ErrorAction SilentlyContinue)) {
  Remove-ItemProperty -Path $runKey -Name $runValueName -Force
  Write-Host "Registry autorun '$runValueName' removed." -ForegroundColor Green
  $removedAny = $true
}

if (-not $removedAny) {
  Write-Host 'No MediTrack auto-start configuration was found.' -ForegroundColor Yellow
}
