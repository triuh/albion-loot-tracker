@echo off
chcp 65001 >nul
cls
echo ==========================================
echo   Albion Loot Tracker - Netlify CLI Deploy
echo ==========================================
echo.

cd /d "%~dp0"

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found!
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)
echo OK
echo.

echo [2/5] Installing Netlify CLI (if needed)...
call npm install -g netlify-cli
if errorlevel 1 (
    echo ERROR: Failed to install Netlify CLI
    pause
    exit /b 1
)
echo OK
echo.

echo [3/5] Checking Netlify login...
npx netlify status >nul 2>&1
if errorlevel 1 (
    echo You need to login to Netlify.
    echo Browser will open automatically...
    echo.
    npx netlify login
    if errorlevel 1 (
        echo ERROR: Login failed
        pause
        exit /b 1
    )
)
echo OK
echo.

echo [4/5] Linking to site...
if not exist ".netlify\state.json" (
    echo.
    echo No site linked yet. Options:
    echo A) Create NEW site (recommended for first time)
    echo B) Link to EXISTING site
    echo.
    choice /C AB /M "Choose"
    if errorlevel 2 (
        echo.
        echo Enter your existing site ID (from Netlify dashboard):
        set /p SITEID="Site ID: "
        npx netlify link --id %SITEID%
    ) else (
        echo.
        npx netlify sites:create --name albion-loot-tracker
        npx netlify link
    )
)
echo OK
echo.

echo [5/5] Deploying to production...
echo This will build the project and deploy with Functions.
echo.
npx netlify deploy --prod --build

echo.
echo ==========================================
echo   Done! Check the URL above.
echo ==========================================
pause
