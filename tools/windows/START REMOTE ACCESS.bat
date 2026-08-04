@echo off
setlocal EnableExtensions
set "PROJECT_DIR=%~dp0"
if exist "%~dp0..\..\package.json" set "PROJECT_DIR=%~dp0..\.."
set "SYSTEM_DIR=%PROJECT_DIR%"
if exist "%PROJECT_DIR%\System\package.json" set "SYSTEM_DIR=%PROJECT_DIR%\System"
cd /d "%PROJECT_DIR%"
title The Howling Whispers - Remote Access

set "START_SCRIPT=%~dp0START THE HOWLING WHISPERS.bat"

echo.
echo  The Howling Whispers - Remote Test Mode
echo  ---------------------------------------
echo.
echo This mode exposes HTTP port 5173 to the network.
echo DNS does not encrypt traffic or hide the port.
echo.

echo Requesting permission for the Windows Firewall rule...
powershell.exe -NoProfile -Command "Start-Process powershell.exe -Verb RunAs -Wait -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File ""%SYSTEM_DIR%\scripts\enable-remote-firewall.ps1""'"
if errorlevel 1 (
  echo The firewall rule could not be enabled.
  pause
  endlocal & exit /b 1
)

set "HOWLING_REMOTE_ACCESS=1"
for /f "usebackq delims=" %%I in (`curl.exe -s --max-time 10 https://api.ipify.org`) do set "PUBLIC_IP=%%I"

echo.
echo Router configuration required:
echo - Forward external TCP port 5173 to the local network address shown after startup.
echo - Public address: http://%PUBLIC_IP%:5173/?preview=app
echo - Point DNS to %PUBLIC_IP%, then use http://your-domain:5173/?preview=app
echo.
echo Keep this terminal open. Press Ctrl+C to stop the server.
echo Run DISABLE REMOTE ACCESS.bat to remove the firewall rule.
echo.

call "%START_SCRIPT%"
set "EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %EXIT_CODE%
