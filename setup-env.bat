@echo off
echo Checking .env file...
echo.

if exist .env (
    echo ✅ .env file already exists
) else (
    echo ⚠️  .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env
    echo ✅ .env file created successfully!
    echo.
    echo You can now run: npm run dev
)

echo.
pause
