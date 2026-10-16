@echo off
echo ====================================
echo MediaHive ERP v10.0.0
echo Building Both Versions
echo ====================================
echo.
echo This script will build:
echo 1. Clean Version (10.0.0-clean) - Empty Database
echo 2. Data Version (10.0.0-data) - With Existing Data
echo.
echo This process may take 10-15 minutes...
echo.
pause

echo.
echo ====================================
echo Building Clean Version...
echo ====================================
call build-clean.bat
if %errorlevel% neq 0 (
    echo Clean version build failed!
    pause
    exit /b 1
)

echo.
echo ====================================
echo Building Data Version...
echo ====================================
call build-data.bat
if %errorlevel% neq 0 (
    echo Data version build failed!
    pause
    exit /b 1
)

echo.
echo ====================================
echo Build Complete!
echo ====================================
echo.
echo Clean Version: dist-electron-v10-clean
echo Data Version: dist-electron-v10-data
echo.
echo Release Notes: RELEASE_NOTES_v10.md
echo.
pause
