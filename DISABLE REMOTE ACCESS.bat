@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title The Howling Whispers - Disable Remote Access

set "SYSTEM_DIR=%~dp0System"
if not exist "%SYSTEM_DIR%\scripts\disable-remote-firewall.ps1" set "SYSTEM_DIR=%~dp0"

powershell.exe -NoProfile -Command "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%SYSTEM_DIR%\scripts\disable-remote-firewall.ps1""'"
if errorlevel 1 (
  echo The firewall rule could not be removed.
  pause
  endlocal & exit /b 1
)

echo Remote firewall access is disabled.
echo Close any running remote server terminal to stop the application itself.
pause
endlocal & exit /b 0
