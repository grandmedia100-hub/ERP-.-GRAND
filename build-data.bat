@echo off
echo ====================================
echo Building MediaHive v10.0.0-data
echo With Existing Data
echo ====================================
echo.

echo Step 1: Backing up original package.json...
copy package.json package-original.json.bak
echo.

echo Step 2: Using data version package.json...
copy package-data.json package.json
echo.

echo Step 3: Copying data server configuration...
copy server\server-data.js server\server.js
echo.

echo Step 4: Building frontend...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    echo Restoring original package.json...
    copy package-original.json.bak package.json
    pause
    exit /b 1
)
echo.

echo Step 5: Packaging application...
call npm run package
if %errorlevel% neq 0 (
    echo Packaging failed!
    echo Restoring original package.json...
    copy package-original.json.bak package.json
    pause
    exit /b 1
)
echo.

echo Step 6: Restoring original package.json...
copy package-original.json.bak package.json
echo.

echo ====================================
echo Data version build completed!
echo Output: dist-electron-v10-data
echo ====================================
pause
