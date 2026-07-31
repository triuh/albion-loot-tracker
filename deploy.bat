@echo off
chcp 65001 >nul
cls
echo ==========================================
echo   Albion Loot Tracker - Netlify Deploy
echo ==========================================
echo.

set "PROJECT_DIR=%~dp0"
cd /d "%PROJECT_DIR%"

echo [1/5] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js not found! Please install Node.js first.
    echo Download: https://nodejs.org/
    pause
    exit /b 1
)
echo OK: Node.js found
echo.

echo [2/5] Checking Netlify CLI...
npx netlify --version >nul 2>&1
if errorlevel 1 (
    echo Installing Netlify CLI globally...
    call npm install -g netlify-cli
    if errorlevel 1 (
        echo ERROR: Failed to install Netlify CLI
        pause
        exit /b 1
    )
)
echo OK: Netlify CLI ready
echo.

echo [3/5] Checking login...
npx netlify status >nul 2>&1
if errorlevel 1 (
    echo You need to login to Netlify first.
    echo A browser window will open...
    echo.
    npx netlify login
    if errorlevel 1 (
        echo ERROR: Login failed
        pause
        exit /b 1
    )
)
echo OK: Logged in
echo.

echo [4/5] Linking to Netlify site...
if not exist ".netlify\state.json" (
    echo No site linked yet. Let's create one...
    echo.
    npx netlify sites:create --name albion-loot-tracker
    if errorlevel 1 (
        echo Site might already exist, trying to link...
        npx netlify link
    )
) else (
    echo OK: Site already linked
)
echo.

echo [5/5] Building and deploying...
echo This may take a minute...
echo.
npx netlify deploy --prod --build
if errorlevel 1 (
    echo.
    echo ERROR: Deploy failed!
    echo Trying alternative method...
    echo.
    call npm run build
    npx netlify deploy --prod --dir=dist
)

echo.
echo ==========================================
echo   Deploy complete!
echo ==========================================
echo.
pause
