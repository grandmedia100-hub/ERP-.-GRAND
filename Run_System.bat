@echo off
TITLE MediaHive ERP System Launcher
color 1F

echo ========================================================
echo        MediaHive ERP - Starting System... 🚀
echo ========================================================
echo.

:: 1. Start Server in a new minimized window
echo [1/3] Starting Backend Server...
start /min "MediaHive Server" cmd /c "cd /d %~dp0server && node server.js"
timeout /t 2 /nobreak >nul

:: 2. Start Frontend in a new minimized window
echo [2/3] Starting Frontend Application...
start /min "MediaHive Frontend" cmd /c "cd /d %~dp0 && npm run dev"

:: 3. Open Browser
echo [3/3] Opening Browser...
timeout /t 5 /nobreak >nul
start "" "http://localhost:3006"

echo.
echo ========================================================
echo    ✅ System Started Successfully!
echo    Don't close the black windows that appeared.
echo    You can minimize them.
echo ========================================================
timeout /t 10
