@echo off
REM ============================================================
REM  FleetOps setup for XAMPP on Windows
REM  Run this from the repo root AFTER git clone.
REM  Requires: XAMPP installed (Apache + MySQL + PHP), Node.js
REM ============================================================
setlocal enabledelayedexpansion

set "XAMPP=C:\xampp"
if not exist "%XAMPP%\htdocs" (
  echo XAMPP not found at %XAMPP%.
  echo Install XAMPP, or edit this script to point XAMPP at your install.
  exit /b 1
)

echo [1/3] Copying api\ to %XAMPP%\htdocs\fleetops\api\ ...
if not exist "%XAMPP%\htdocs\fleetops" mkdir "%XAMPP%\htdocs\fleetops"
xcopy /E /I /Y api "%XAMPP%\htdocs\fleetops\api" >nul
if errorlevel 1 (
  echo Failed to copy api folder.
  exit /b 1
)

echo [2/3] Importing fleetops_db.sql ...
"%XAMPP%\mysql\bin\mysql.exe" -h 127.0.0.1 --protocol=TCP -u root -e "CREATE DATABASE IF NOT EXISTS fleetops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if errorlevel 1 (
  echo Could not create the fleetops_db database. Make sure MySQL is running in XAMPP.
  exit /b 1
)
"%XAMPP%\mysql\bin\mysql.exe" -h 127.0.0.1 --protocol=TCP -u root fleetops_db < fleetops_db.sql
if errorlevel 1 (
  echo SQL import failed. Make sure MySQL is running in XAMPP.
  echo If your MySQL root user has a password, import manually via phpMyAdmin
  echo and set it in api\config.php.
) else (
  echo SQL import OK.
)

echo [3/3] Installing frontend dependencies ...
call npm install
if errorlevel 1 (
  echo npm install failed. Check that Node.js is installed and on PATH.
  exit /b 1
)

echo.
echo ============================================================
echo  Setup complete!
echo  1. Start Apache and MySQL in the XAMPP Control Panel.
echo  2. Run:  npm run dev
echo  3. Open: http://localhost:5173
echo     Login: admin / admin123
echo ============================================================
pause