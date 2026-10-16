@echo off
echo ====================================
echo Preparing MediaHive Versions
echo ====================================
echo.

echo Step 1: Creating backup of current database...
copy "server\mediahive.db" "server\mediahive-backup.db"
echo Backup created successfully!
echo.

echo Step 2: Creating clean database...
copy "server\mediahive.db" "server\mediahive-clean.db"
echo Clean database created!
echo.

echo Step 3: Creating data database...
copy "server\mediahive.db" "server\mediahive-data.db"
echo Data database created!
echo.

echo Step 4: Creating build directories...
if not exist "dist-electron-v10-clean" mkdir "dist-electron-v10-clean"
if not exist "dist-electron-v10-data" mkdir "dist-electron-v10-data"
echo Directories created!
echo.

echo ====================================
echo All preparations completed!
echo ====================================
pause
