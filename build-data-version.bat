@echo off
echo ====================================
echo Building MediaHive v10.0.0-data
echo ====================================
echo.

echo Step 1: Verifying data database exists...
if not exist "server\mediahive-data.db" (
    echo Error: mediahive-data.db not found!
    pause
    exit /b 1
)
echo Data database found!
echo.

echo Step 2: Updating package.json for data version...
echo This will be done manually or by script
echo.

echo Step 3: Building application...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo.

echo ====================================
echo Data version build completed!
echo ====================================
pause
