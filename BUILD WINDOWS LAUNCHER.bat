@echo off
setlocal EnableExtensions
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\build-windows-launcher.ps1"
if errorlevel 1 (
  echo.
  echo The Windows launcher could not be built.
  pause
  endlocal & exit /b 1
)

echo.
echo Launcher build complete.
pause
endlocal & exit /b 0
