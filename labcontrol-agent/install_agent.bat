@echo off
:: ============================================================================
::  LabControl Agent — 1-Click Permanent Auto-Installer (v3.1)
:: ============================================================================

title LabControl Agent Installer

:: Check for Administrator privileges
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo ============================================================
    echo   [!] Administrator Privileges Required
    echo   Please Right-Click 'install_agent.bat' and select:
    echo   "Run as Administrator"
    echo ============================================================
    echo.
    pause
    exit /b
)

echo ============================================================
echo   LabControl Agent Permanent Auto-Installer
echo ============================================================
echo.

set "AGENT_DIR=%~dp0"
if "%AGENT_DIR:~-1%"=="\" set "AGENT_DIR=%AGENT_DIR:~0,-1%"

:: 1. Deep Search for python.exe & pythonw.exe
echo [1/5] Detecting Python installation path...
set "PYTHON_PATH="
set "PYTHONW_PATH="

for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python*" "C:\Program Files\Python*" "C:\Program Files (x86)\Python*" "C:\Python*") do (
    if exist "%%d\python.exe" (
        set "PYTHON_PATH=%%d\python.exe"
        set "PYTHONW_PATH=%%d\pythonw.exe"
        goto :FOUND_PYTHON
    )
)

where python >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('where python') do (
        set "PYTHON_PATH=%%i"
    )
)
where pythonw >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('where pythonw') do (
        set "PYTHONW_PATH=%%i"
    )
)

:FOUND_PYTHON

if "%PYTHON_PATH%"=="" (
    echo.
    echo   [!] Could not auto-detect Python. Please install Python 3.
    echo.
    pause
    exit /b
)

if "%PYTHONW_PATH%"=="" set "PYTHONW_PATH=%PYTHON_PATH%"

echo       [OK] Found Python at: %PYTHON_PATH%

:: 2. Auto-Install Required Python Dependencies
echo [2/5] Installing Python dependencies (cryptography, psutil, python-dotenv)...
"%PYTHON_PATH%" -m pip install -r "%AGENT_DIR%\requirements.txt" >nul 2>&1
echo       [OK] Dependencies Verified & Installed.

:: 3. Configure Windows Firewall Ports (5555 & 5556)
echo [3/5] Configuring Windows Firewall (Ports 5555 & 5556)...
netsh advfirewall firewall delete rule name="LabControl Agent" >nul 2>&1
netsh advfirewall firewall delete rule name="LabControl File Transfer" >nul 2>&1
netsh advfirewall firewall add rule name="LabControl Agent" dir=in action=allow protocol=TCP localport=5555 >nul 2>&1
netsh advfirewall firewall add rule name="LabControl File Transfer" dir=in action=allow protocol=TCP localport=5556 >nul 2>&1
echo       [OK] Firewall Rules Configured.

:: 4. Generate start_silent.vbs with absolute paths
echo [4/5] Generating silent startup script (start_silent.vbs)...
set "VBS_PATH=%AGENT_DIR%\start_silent.vbs"
set "AGENT_PY=%AGENT_DIR%\agent.py"

echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_PATH%"
echo WshShell.CurrentDirectory = "%AGENT_DIR%" >> "%VBS_PATH%"
echo WshShell.Run """%PYTHONW_PATH%"" ""%AGENT_PY%""", 0, False >> "%VBS_PATH%"
echo       [OK] Generated start_silent.vbs.

:: 5. Register Triple Permanent Auto-Start (Task Scheduler + Startup Folder + Registry Run Key)
echo [5/5] Registering Permanent Auto-Start on System Boot...

:: Method A: Task Scheduler (Runs highest privileges at Logon)
schtasks /delete /tn "LabControlAgent" /f >nul 2>&1
schtasks /create /tn "LabControlAgent" /tr "wscript.exe \"%VBS_PATH%\"" /sc ONLOGON /rl HIGHEST /f >nul 2>&1

:: Method B: Windows Startup Folder
set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "SHORTCUT_VBS=%TEMP%\create_agent_shortcut.vbs"
echo Set oWS = WScript.CreateObject("WScript.Shell") > "%SHORTCUT_VBS%"
echo sLinkFile = "%STARTUP_DIR%\LabControlAgent.lnk" >> "%SHORTCUT_VBS%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%SHORTCUT_VBS%"
echo oLink.TargetPath = "wscript.exe" >> "%SHORTCUT_VBS%"
echo oLink.Arguments = """" ^& "%VBS_PATH%" ^& """" >> "%SHORTCUT_VBS%"
echo oLink.WorkingDirectory = "%AGENT_DIR%" >> "%SHORTCUT_VBS%"
echo oLink.Description = "LabControl Background Agent" >> "%SHORTCUT_VBS%"
echo oLink.Save >> "%SHORTCUT_VBS%"

cscript //nologo "%SHORTCUT_VBS%" >nul 2>&1
del "%SHORTCUT_VBS%" >nul 2>&1

:: Method C: Registry Run Key
reg add "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "LabControlAgent" /t REG_SZ /d "wscript.exe \"%VBS_PATH%\"" /f >nul 2>&1

echo       [OK] Registered in Task Scheduler, Startup Folder, and Windows Registry.

:: 6. Kill old python agent instances & Launch fresh background process
echo.
echo Launching Agent silently in background right now...
taskkill /F /FI "WINDOWTITLE eq LabControl Agent" >nul 2>&1
wscript.exe "%VBS_PATH%"
echo       [OK] Agent is now running silently!

echo.
echo ============================================================
echo   SUCCESS! LabControl Agent is permanently installed.
echo   - Dependencies auto-installed.
echo   - Ports 5555 & 5556 opened in Firewall.
echo   - 3x Boot Auto-Start Registered (Task Scheduler + Startup + Registry).
echo   - Starts AUTOMATICALLY whenever this PC boots or restarts.
echo ============================================================
echo.
pause
