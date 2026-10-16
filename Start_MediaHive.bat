@echo off
title MediaHive ERP Server
color 0A
cls
echo ========================================================
echo              MediaHive ERP - Local Server
echo ========================================================
echo.
echo [1/2] Starting server...
echo [2/2] Opening browser...
echo.
echo  NOTE: Please KEEP THIS WINDOW OPEN while using the app.
echo  To close the app, simply close this window.
echo.
echo ========================================================

start http://localhost:3000

call npx -y serve -s dist -l 3000

pause
