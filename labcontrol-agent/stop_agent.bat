@echo off
:: ============================================================================
::  LabControl Agent — Temporary Stop Script
:: ============================================================================
::  This script temporarily stops only the running Agent process.
::  It does NOT kill Flask app.py server or delete startup shortcuts.
:: ============================================================================

title Stop LabControl Agent

echo Stopping LabControl Agent background processes...

taskkill /F /IM pythonw.exe >nul 2>&1
wmic process where "commandline like '%%agent.py%%'" call terminate >nul 2>&1

echo.
echo ============================================================
echo   LabControl Agent has been STOPPED.
echo   (Admin Dashboard app.py server is untouched and running)
echo ============================================================
echo.
pause
