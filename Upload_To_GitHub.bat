@echo off
chcp 65001 >nul
title رفع المشروع إلى GitHub - MediaHive ERP
echo ====================================================================
echo               رفع مشروع MediaHive ERP إلى GitHub
echo ====================================================================
echo.

cd /d "H:\mediahive001"
set "PATH=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%PATH%"

echo التحقق من الاتصال والمستودع...
git remote -v
echo.
echo جاري رفع الملفات إلى الفرع main...
echo.

git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ====================================================================
    echo   [نجاح] تم رفع المشروع بالكامل إلى GitHub بنجاح!
    echo ====================================================================
) else (
    echo.
    echo ====================================================================
    echo   [ملاحظة] إذا طُلب منك إدخال كلمة المرور (Password):
    echo   يرجى إدخال Personal Access Token الخاص بحسابك بدلاً من كلمة المرور العادية.
    echo ====================================================================
)

echo.
pause
