@echo off
TITLE MediaHive Web Server
color 0A
cls
echo ========================================================
echo        MediaHive ERP - Web Server Launcher
echo ========================================================
echo.
echo [INFO] Starting the web server...
echo.
echo [INFO] Opening Browser automatically at http://localhost:3000
echo.
echo [INFO] To access from other devices (Mobile/Laptop), use the IP below:
ipconfig | findstr "IPv4"
echo.
echo ========================================================
echo.

:: Open Browser (Wait 2 seconds then open, running in parallel to let server start)
start "" "http://localhost:3000"

:: Start Server
cd /d "%~dp0"
call npx -y serve -s dist -l 3000 --cors
pause
