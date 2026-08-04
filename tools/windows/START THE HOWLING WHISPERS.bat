@echo off
setlocal EnableExtensions
set "PROJECT_DIR=%~dp0"
if exist "%~dp0..\..\package.json" set "PROJECT_DIR=%~dp0..\.."
if exist "%~dp0System\package.json" set "PROJECT_DIR=%~dp0System"
cd /d "%PROJECT_DIR%"
title The Howling Whispers

echo.
echo  The Howling Whispers
echo  --------------------
echo.

where node.exe >nul 2>nul
if errorlevel 1 goto :missing_node

node -e "const [major,minor]=process.versions.node.split('.').map(Number);process.exit(major>22||(major===22&&minor>=13)?0:1)"
if errorlevel 1 goto :old_node

where npm.cmd >nul 2>nul
if errorlevel 1 goto :missing_node

echo Checking for application updates...
node "scripts\update-windows.mjs"
if errorlevel 1 echo Update check failed. Continuing with the installed version.

echo Checking project dependencies...
node -e "const fs=require('node:fs'),path=require('node:path');try{const lock=require('./package-lock.json'),root=lock.packages[''],names=Object.keys({...root.dependencies,...root.devDependencies});const ready=names.every(name=>{const wanted=lock.packages['node_modules/'+name]?.version;const installed=JSON.parse(fs.readFileSync(path.join('node_modules',name,'package.json'),'utf8')).version;return wanted===installed});process.exit(ready&&fs.existsSync('node_modules/.bin/vite.cmd')?0:1)}catch{process.exit(1)}"
if not errorlevel 1 goto :launch

echo Installing locked dependencies. This is only needed on first run or after an update...
call npm.cmd ci
if errorlevel 1 goto :install_failed

:launch
echo Starting the local story server...
echo Keep this window open while using the application.
echo.
call npm.cmd run launch:windows
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo The application stopped with error code %EXIT_CODE%.
  pause
)
endlocal & exit /b %EXIT_CODE%

:missing_node
echo Node.js 22.13 or newer is required but was not found.
echo Download the current Node.js LTS installer from:
echo https://nodejs.org/en/download
echo.
pause
endlocal & exit /b 1

:old_node
echo The installed Node.js version is too old.
node --version
echo Install Node.js 22.13 or newer from:
echo https://nodejs.org/en/download
echo.
pause
endlocal & exit /b 1

:install_failed
echo.
echo Dependency installation failed. Check the messages above and your internet connection.
pause
endlocal & exit /b 1
