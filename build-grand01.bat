@echo off
TITLE Building ERP Grand.01...
color 0B
cls
echo ============================================================
echo           ERP Grand.01 - Build Script
echo ============================================================
echo.

:: Backup original package.json
echo [1/4] Backing up original package.json...
copy /Y package.json package-original-backup.json >nul

:: Copy Grand.01 package config
echo [2/4] Applying ERP Grand.01 configuration...
copy /Y package-grand01.json package.json >nul

:: Add nodejs to PATH then run the build
echo [3/4] Building frontend + packaging with Electron Builder...
set PATH=C:\Program Files\nodejs;%PATH%
call "C:\Program Files\nodejs\npm.cmd" run package

:: Restore original package.json
echo [4/4] Restoring original package.json...
copy /Y package-original-backup.json package.json >nul
del package-original-backup.json >nul

echo.
echo ============================================================
echo    ERP Grand.01 build complete!
echo    Output folder: dist-electron-grand01
echo ============================================================
pause
