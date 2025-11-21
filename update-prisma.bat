@echo off
echo Generating Prisma Client...
call npx prisma generate

echo.
echo Deploying migrations...
call npx prisma migrate deploy

echo.
echo Done!
pause
