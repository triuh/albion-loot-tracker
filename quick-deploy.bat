@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ==========================================
echo   Quick Deploy - Albion Loot Tracker
echo ==========================================
echo.

echo Building...
call npm run build
if errorlevel 1 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Deploying to Netlify...
npx netlify deploy --prod --dir=dist

echo.
pause
