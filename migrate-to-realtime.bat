@echo off
REM VHM Queue Board - Real-time Migration Script
REM This script helps you migrate from polling to Pusher real-time sync

echo.
echo ======================================================
echo    VHM Queue Board - Real-time Sync Migration
echo ======================================================
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] .env file not found. Creating from .env.example...
    copy .env.example .env
    echo [OK] Created .env file
    echo.
    echo [IMPORTANT] You need to add Pusher credentials to .env:
    echo   1. Sign up at https://pusher.com
    echo   2. Create a Channels app
    echo   3. Copy credentials to .env:
    echo      - PUSHER_APP_ID
    echo      - PUSHER_SECRET
    echo      - NEXT_PUBLIC_PUSHER_KEY
    echo      - NEXT_PUBLIC_PUSHER_CLUSTER
    echo.
    echo   See PUSHER-SETUP.md for detailed instructions
    echo.
    pause
) else (
    echo [OK] .env file exists
)

echo.
echo [Step 1/2] Installing dependencies (including Pusher)...
call npm install

if errorlevel 1 (
    echo [ERROR] npm install failed. Please check errors above.
    pause
    exit /b 1
)

echo.
echo [OK] Dependencies installed successfully!
echo.

echo [Step 2/2] Checking Pusher credentials...
findstr /C:"PUSHER_APP_ID=\"your_app_id\"" .env >nul
if %errorlevel%==0 (
    echo.
    echo [WARNING] Pusher credentials not configured!
    echo   Your .env still has placeholder values.
    echo.
    echo   Please edit .env and add real Pusher credentials
    echo   See PUSHER-SETUP.md for step-by-step guide
    echo.
    pause
)

echo.
echo ======================================================
echo    Migration complete!
echo ======================================================
echo.
echo Next steps:
echo   1. Verify Pusher credentials in .env
echo   2. Run: npm run dev
echo   3. Open http://localhost:3000
echo   4. Look for (Green circle) Real-time indicator in top-right
echo   5. Test with 2 browser tabs
echo.
echo Documentation:
echo   - PUSHER-SETUP.md - Detailed Pusher setup guide
echo   - REALTIME-MIGRATION.md - What changed in this migration
echo   - README.md - General usage guide
echo.
echo Happy real-time coding!
echo.
pause
