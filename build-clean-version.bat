@echo off
echo ====================================
echo Building MediaHive v10.0.0-clean
echo ====================================
echo.

echo Step 1: Clearing clean database...
cd server
node clear-clean-db.js
if %errorlevel% neq 0 (
    echo Failed to clear database!
    pause
    exit /b 1
)
cd ..
echo.

echo Step 2: Updating package.json for clean version...
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
echo Clean version build completed!
echo ====================================
pause
