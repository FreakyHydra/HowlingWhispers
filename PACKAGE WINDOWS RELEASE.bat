@echo off
setlocal EnableExtensions
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "scripts\package-windows-release.ps1"
if errorlevel 1 (
  echo.
  echo The Windows release could not be packaged.
  pause
  endlocal & exit /b 1
)

echo.
echo Release package created in the release folder.
pause
endlocal & exit /b 0
