@echo off
setlocal

set "ROOT=%~dp0"

echo Starting MediTrack services...
echo.
echo Reminder: Start MySQL in XAMPP (port 3306) for backend database access.
echo.

start "MediTrack Backend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%ROOT%backend'; mvn spring-boot:run"
start "MediTrack Frontend" powershell -NoExit -ExecutionPolicy Bypass -Command "Set-Location '%ROOT%frontend'; if (-not (Test-Path 'node_modules')) { npm.cmd install }; npm.cmd run dev -- --host 0.0.0.0 --port 5173"

echo Backend:  http://localhost:8080/api
echo Frontend: http://localhost:5173
echo Keep both opened windows running while using MediTrack.
