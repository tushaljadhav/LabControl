@echo off
:: ============================================================================
::  LabControl Agent — 1-Click Uninstaller
:: ============================================================================
::  This script cleanly removes the LabControl Agent from the PC:
::    1. Stops any running Python agent processes.
::    2. Removes the startup shortcut from Windows Startup folder.
::    3. Removes the Windows Firewall rule.
:: ============================================================================

title LabControl Agent Uninstaller

:: Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ============================================================
    echo   [!] Administrator Privileges Required
    echo   Please Right-Click 'uninstall_agent.bat' and select:
    echo   "Run as Administrator"
    echo ============================================================
    echo.
    pause
    exit /b
)

echo ============================================================
echo   LabControl Agent Auto-Uninstaller
echo ============================================================
echo.

:: 1. Remove Startup Shortcut
echo [1/3] Removing from Windows Startup...
set "STARTUP_SHORTCUT=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\LabControlAgent.lnk"
if exist "%STARTUP_SHORTCUT%" (
    del /f /q "%STARTUP_SHORTCUT%" >nul 2>&1
    echo       [OK] Startup shortcut removed.
) else (
    echo       [OK] No startup shortcut found.
)

:: 2. Remove Firewall Rule
echo [2/3] Removing Windows Firewall Rule...
netsh advfirewall firewall delete rule name="LabControl Agent" >nul 2>&1
echo       [OK] Firewall Rule Removed.

:: 3. Stop Running Python Processes
echo [3/3] Stopping Running Agent Processes...
taskkill /F /IM pythonw.exe >nul 2>&1
taskkill /F /IM python.exe >nul 2>&1
echo       [OK] Background processes stopped.

echo.
echo ============================================================
echo   SUCCESS! LabControl Agent has been completely removed.
echo   You can now safely delete the labcontrol-agent folder.
echo ============================================================
echo.
pause
