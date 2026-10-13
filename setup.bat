@echo off
REM ============================================================
REM  FleetOps setup for XAMPP on Windows
REM  Run this from the repo root AFTER git clone.
REM  Requires: XAMPP installed (Apache + MySQL + PHP), Node.js
REM
REM  Double-clicking (no args) is safe to repeat: it keeps any
REM  existing fleetops_db data, copies api\, and applies
REM  api\migrations\*.sql.
REM
REM      setup.bat          keep data (seed import only if the DB is new)
REM      setup.bat reset    wipe fleetops_db, re-import seed data, migrate
REM
REM  The migrations are not optional: fleetops_db.sql does NOT
REM  contain the recommendation_logs table the AI assistant
REM  writes its exposure rows to. Without that table every
REM  "Get Recommendations" call dies server-side and the customer
REM  dashboard reports:
REM      The AI service returned an unreadable response.
REM ============================================================
setlocal enabledelayedexpansion

set "XAMPP=C:\xampp"
if not exist "%XAMPP%\htdocs" (
  echo XAMPP not found at %XAMPP%.
  echo Install XAMPP, or edit this script to point XAMPP at your install.
  pause
  exit /b 1
)

set "MYSQL=%XAMPP%\mysql\bin\mysql.exe"
if not exist "%MYSQL%" (
  echo MySQL not found at %MYSQL%.
  echo Reinstall XAMPP with MySQL, or edit this script to match your install.
  pause
  exit /b 1
)

set "RESET=0"
if /I "%~1"=="reset" set "RESET=1"

echo [1/4] Copying api\ to %XAMPP%\htdocs\fleetops\api\ ...
if not exist "%XAMPP%\htdocs\fleetops" mkdir "%XAMPP%\htdocs\fleetops"
xcopy /E /I /Y api "%XAMPP%\htdocs\fleetops\api" >nul
if errorlevel 1 (
  echo Failed to copy api folder.
  pause
  exit /b 1
)

echo [2/4] Preparing fleetops_db ...
"%MYSQL%" -h 127.0.0.1 --protocol=TCP -u root -e "CREATE DATABASE IF NOT EXISTS fleetops_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if errorlevel 1 (
  echo Could not reach MySQL. Start it in the XAMPP Control Panel and try again.
  echo If your MySQL root user has a password, add it to api\config.php and to
  echo the mysql commands in this script.
  pause
  exit /b 1
)

REM How many tables does fleetops_db already have? 0 means a fresh install.
set "TABLES="
"%MYSQL%" -h 127.0.0.1 --protocol=TCP -u root -N -B fleetops_db -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE();" > "%TEMP%\fleetops_tables.txt" 2>nul
set /p TABLES=<"%TEMP%\fleetops_tables.txt"
del "%TEMP%\fleetops_tables.txt" >nul 2>&1
if not defined TABLES set "TABLES=0"

if "!TABLES!"=="0" goto IMPORT_SEED
if "!RESET!"=="1" goto IMPORT_SEED

echo        fleetops_db already has !TABLES! table(s) - keeping your data, skipping the seed import.
echo        (run "setup.bat reset" to wipe it and start from seed data)
goto MIGRATE

:IMPORT_SEED
if "!TABLES!"=="0" (
  echo        New database - importing fleetops_db.sql ...
) else (
  echo        reset requested - wiping fleetops_db and re-importing seed data ...
)
"%MYSQL%" -h 127.0.0.1 --protocol=TCP -u root fleetops_db < fleetops_db.sql
if errorlevel 1 (
  echo SQL import failed. Make sure MySQL is running in XAMPP.
  echo If your MySQL root user has a password, import manually via phpMyAdmin
  echo and set it in api\config.php.
  pause
  exit /b 1
)
echo        SQL import OK.

:MIGRATE
echo [3/4] Applying api\migrations\*.sql ...
if not exist "api\migrations\*.sql" (
  echo No SQL files found in api\migrations. The AI assistant needs them
  echo ^(recommendation_logs, vehicles.luggage_capacity, ...^) - clone the full repo.
  pause
  exit /b 1
)
for %%F in ("api\migrations\*.sql") do (
  echo        - %%~nxF
  "%MYSQL%" -h 127.0.0.1 --protocol=TCP -u root fleetops_db < "%%~F"
  if errorlevel 1 (
    echo        FAILED while applying %%~nxF
    echo        Without these migrations the AI recommendation endpoint cannot run.
    pause
    exit /b 1
  )
)

echo [4/4] Installing frontend dependencies ...
call npm install
if errorlevel 1 (
  echo npm install failed. Check that Node.js is installed and on PATH.
  pause
  exit /b 1
)

REM ============================================================
REM  Verification: never claim success while the AI would break.
REM ============================================================
echo.
echo Verifying AI prerequisites ...

set "AI_TABLE="
"%MYSQL%" -h 127.0.0.1 --protocol=TCP -u root -N -B fleetops_db -e "SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'fleetops_db' AND TABLE_NAME = 'recommendation_logs';" > "%TEMP%\fleetops_check_table.txt" 2>nul
set /p AI_TABLE=<"%TEMP%\fleetops_check_table.txt"
del "%TEMP%\fleetops_check_table.txt" >nul 2>&1

set "LUGGAGE_COL="
"%MYSQL%" -h 127.0.0.1 --protocol=TCP -u root -N -B fleetops_db -e "SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'fleetops_db' AND TABLE_NAME = 'vehicles' AND COLUMN_NAME = 'luggage_capacity';" > "%TEMP%\fleetops_check_luggage.txt" 2>nul
set /p LUGGAGE_COL=<"%TEMP%\fleetops_check_luggage.txt"
del "%TEMP%\fleetops_check_luggage.txt" >nul 2>&1

if not "!AI_TABLE!"=="1" (
  echo.
  echo  FAIL: the recommendation_logs table is missing.
  echo        AI recommendations will fail with:
  echo        "The AI service returned an unreadable response."
  echo        Apply api\migrations\004_training_gate.sql manually, then re-run.
  pause
  exit /b 1
)

if not "!LUGGAGE_COL!"=="1" (
  echo.
  echo  FAIL: vehicles.luggage_capacity is missing.
  echo        Apply api\migrations\003_ai_assistant.sql manually, then re-run.
  pause
  exit /b 1
)

echo  PASS: recommendation_logs table and vehicles.luggage_capacity present.

echo.
echo ============================================================
echo  Setup complete!
echo  1. Start Apache and MySQL in the XAMPP Control Panel.
echo  2. Run:  npm run dev
echo  3. Open: http://localhost:5173
echo     Login: admin / admin123
echo  AI recommendations: database migrated and verified.
echo ============================================================
pause
