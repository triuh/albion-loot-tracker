@echo off
chcp 65001 >nul
cls
cd /d "%~dp0"

echo ==========================================
echo   GitHub Push Helper
echo ==========================================
echo.

set /p USERNAME="Введи свой GitHub username: "
if "%USERNAME%"=="" (
    echo ERROR: Username не может быть пустым
    pause
    exit /b 1
)

echo.
echo Подключаюсь к https://github.com/%USERNAME%/albion-loot-tracker...
git remote remove origin 2>nul
git remote add origin https://github.com/%USERNAME%/albion-loot-tracker.git
git branch -M main

echo.
echo Пушу на GitHub...
git push -u origin main

if errorlevel 1 (
    echo.
    echo ==========================================
    echo   ОШИБКА!
    echo ==========================================
    echo.
    echo Возможные причины:
    echo 1. Репозиторий еще не создан на GitHub
    echo    ^> Зайди на https://github.com/new
    echo    ^> Назови: albion-loot-tracker
    echo    ^> Не ставь галочки README/.gitignore
    echo    ^> Нажми Create repository
    echo.
    echo 2. Неправильный username
    echo    ^> Проверь свой ник на github.com
    echo.
    echo 3. Не авторизован git
    echo    ^> При пуше откроется окно авторизации
    echo.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   УСПЕХ! Код залит на GitHub
echo ==========================================
echo.
echo Теперь настрой Netlify:
echo 1. Зайди на https://app.netlify.com/
echo 2. Add new site ^> Import from GitHub
echo 3. Выбери репозиторий albion-loot-tracker
echo 4. Build command: npm run build
echo 5. Publish directory: dist
echo 6. Нажми Deploy site
echo.
pause
