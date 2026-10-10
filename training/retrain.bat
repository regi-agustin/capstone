@echo off
REM FleetOps auto-retrain entry point (Windows Task Scheduler).
REM
REM Register (daily 2:00 AM, only when data/flag changed):
REM   schtasks /create /tn "FleetOps AutoRetrain" /tr "C:\Users\User\Desktop\FleetOps\training\retrain.bat" /sc daily /st 02:00
REM
REM The pipeline is fail-safe: gate -> train -> E1 non-inferiority + E2 policy
REM suite + E3a CF safety. Models only replace production when every hard gate
REM passes; otherwise the candidate is held in api\model\pending\ and the old
REM model keeps serving.

cd /d "%~dp0.."
python training\retrain.py --if-needed >> training\retrain.log 2>&1
exit /b %ERRORLEVEL%
