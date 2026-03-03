@echo off
REM Start Local Server for Addict Website (Windows)
REM This fixes the CORS error

echo.
echo ========================================
echo   Starting Addict Website Server
echo ========================================
echo.
echo Choose your method:
echo 1. Python
echo 2. Node.js (npx serve)
echo 3. PHP
echo.
set /p choice="Enter choice (1-3): "

if "%choice%"=="1" (
    echo.
    echo Starting Python server on port 8000...
    echo Open browser: http://localhost:8000
    echo Press Ctrl+C to stop
    echo.
    python -m http.server 8000
) else if "%choice%"=="2" (
    echo.
    echo Starting Node.js server...
    npx serve .
) else if "%choice%"=="3" (
    echo.
    echo Starting PHP server on port 8000...
    echo Open browser: http://localhost:8000
    echo Press Ctrl+C to stop
    echo.
    php -S localhost:8000
) else (
    echo.
    echo Invalid choice. Starting Python server...
    python -m http.server 8000
)

pause

