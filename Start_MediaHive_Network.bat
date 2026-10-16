@echo off
title MediaHive ERP - Network Server
color 0B
cls
echo ========================================================
echo          MediaHive ERP - Network Server
echo ========================================================
echo.
echo  Your Application is running at:
echo  http://192.168.1.11:3000
echo.
echo  Share this link with other devices on the WIFI.
echo.
echo  [1/2] Starting web server on 192.168.1.11...
echo  [2/2] Opening local browser...
echo.
echo  DO NOT CLOSE THIS WINDOW.
echo ========================================================

start http://192.168.1.11:3000

:: Using 'serve' to host the 'dist' folder
:: -s: Single Page App (rewrites to index.html)
:: -l: Port to listen on
:: -n: No clipboard copy
:: --cors: Enable CORS
:: --ssl-cert/key: (Optional, not used here)

call npx -y serve -s dist -l 3000 --cors

pause
