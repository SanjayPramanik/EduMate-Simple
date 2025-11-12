@echo off
echo ========================================
echo   EduMate Simple - Quick Start
echo ========================================
echo.

cd /d "%~dp0"

REM Check if Node.js is installed
echo [1/5] Checking Node.js...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo     Node.js: OK

REM Check if backend dependencies are installed
echo [2/5] Checking backend dependencies...
if not exist "node_modules\" (
    echo     Installing backend dependencies...
    call npm install
) else (
    echo     Dependencies: OK
)

REM Check if frontend dependencies are installed
echo [3/5] Checking frontend dependencies...
if not exist "frontend\node_modules\" (
    echo     Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
) else (
    echo     Frontend dependencies: OK
)

echo.
echo ========================================
echo   Starting EduMate Simple!
echo ========================================
echo.
echo Backend: http://localhost:3001
echo Frontend: http://localhost:5173
echo.
echo Two windows will open - keep them running!
echo Press Ctrl+C in each window to stop.
echo.
pause

REM Start Backend
echo [4/5] Starting backend server...
start "EduMate Backend (Simple)" cmd /k "cd /d "%~dp0" && echo Starting backend... && npm start"

REM Wait a bit
timeout /t 3 /nobreak >nul

REM Start Frontend
echo [5/5] Starting frontend...
start "EduMate Frontend" cmd /k "cd /d "%~dp0frontend" && echo Starting frontend... && npm run dev"

echo.
echo ========================================
echo   EduMate is starting!
echo ========================================
echo.
echo Wait 10-15 seconds, then open:
echo http://localhost:5173
echo.
echo Press any key to exit this window...
pause >nul
