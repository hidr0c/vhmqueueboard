@echo off
REM Quick fix script to switch to PostgreSQL for Vercel

echo Switching to PostgreSQL for Vercel deployment...
echo.

REM Backup current schema
copy prisma\schema.prisma prisma\schema.sqlite.backup

REM Copy PostgreSQL schema
copy prisma\schema.postgresql.prisma prisma\schema.prisma

echo.
echo ✅ Schema updated to PostgreSQL
echo.
echo Next steps:
echo 1. Create Postgres database in Vercel Dashboard
echo 2. git add prisma/schema.prisma
echo 3. git commit -m "Switch to PostgreSQL"
echo 4. git push origin main
echo 5. vercel env pull .env.local
echo 6. npx prisma migrate deploy
echo.
echo See SWITCH-TO-POSTGRESQL.md for detailed instructions
echo.
pause
