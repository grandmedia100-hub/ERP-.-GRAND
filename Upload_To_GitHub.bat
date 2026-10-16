@echo off
set "PATH=C:\Users\MAHMOUD\AppData\Local\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd;%PATH%"
cd /d "H:\mediahive001"

echo ========================================================
echo           MediaHive ERP - Upload To GitHub
echo ========================================================
echo.
echo Remote repository:
git remote -v
echo.
echo Pushing branch 'main' to GitHub...
echo.

git push -u origin main

echo.
echo ========================================================
echo Finished! Check the output above.
echo ========================================================
pause
