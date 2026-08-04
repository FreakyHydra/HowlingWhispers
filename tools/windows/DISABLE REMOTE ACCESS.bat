@echo off
setlocal EnableExtensions
set "PROJECT_DIR=%~dp0"
if exist "%~dp0..\..\package.json" set "PROJECT_DIR=%~dp0..\.."
set "SYSTEM_DIR=%PROJECT_DIR%"
if exist "%PROJECT_DIR%\System\package.json" set "SYSTEM_DIR=%PROJECT_DIR%\System"
cd /d "%PROJECT_DIR%"
title The Howling Whispers - Disable Remote Access

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
