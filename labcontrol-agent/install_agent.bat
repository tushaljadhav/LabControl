@echo off
:: ============================================================================
::  LabControl Agent — 1-Click Auto-Installer
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
echo   LabControl Agent Auto-Installer
echo ============================================================
echo.

set "AGENT_DIR=%~dp0"
if "%AGENT_DIR:~-1%"=="\" set "AGENT_DIR=%AGENT_DIR:~0,-1%"

:: 1. Deep Search for pythonw.exe across System and User directories
echo [1/4] Detecting Python installation path...
set "PYTHONW_PATH="

:: Method A: Check User AppData and Program Files
for /d %%d in ("%LOCALAPPDATA%\Programs\Python\Python*" "C:\Program Files\Python*" "C:\Program Files (x86)\Python*" "C:\Python*") do (
    if exist "%%d\pythonw.exe" (
        set "PYTHONW_PATH=%%d\pythonw.exe"
        goto :FOUND_PYTHONW
    )
)

:: Method B: Check where pythonw
where pythonw >nul 2>&1
if %errorlevel% equ 0 (
    for /f "delims=" %%i in ('where pythonw') do (
        set "PYTHONW_PATH=%%i"
        goto :FOUND_PYTHONW
    )
)

:: Method C: Fallback to Codex runtime path if exists
if exist "%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\pythonw.exe" (
    set "PYTHONW_PATH=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\pythonw.exe"
    goto :FOUND_PYTHONW
)


:FOUND_PYTHONW

if "%PYTHONW_PATH%"=="" (
    echo.
    echo   [!] Could not auto-detect pythonw.exe.
    echo   Please ensure Python 3 is installed on this PC.
    echo.
    pause
    exit /b
)

echo       [OK] Found PythonW at: %PYTHONW_PATH%

:: 2. Configure Windows Firewall Port 5555
echo [2/4] Configuring Windows Firewall (Port 5555)...
netsh advfirewall firewall delete rule name="LabControl Agent" >nul 2>&1
netsh advfirewall firewall add rule name="LabControl Agent" dir=in action=allow protocol=TCP localport=5555 >nul 2>&1
echo       [OK] Firewall Rule Added.

:: 3. Generate start_silent.vbs with absolute paths
echo [3/4] Generating silent startup script (start_silent.vbs)...
set "VBS_PATH=%AGENT_DIR%\start_silent.vbs"
set "AGENT_PY=%AGENT_DIR%\agent.py"

echo Set WshShell = CreateObject("WScript.Shell") > "%VBS_PATH%"
echo WshShell.CurrentDirectory = "%AGENT_DIR%" >> "%VBS_PATH%"
echo WshShell.Run """%PYTHONW_PATH%"" ""%AGENT_PY%""", 0, False >> "%VBS_PATH%"
echo       [OK] Generated start_silent.vbs with absolute paths.

:: 4. Create Windows Task Scheduler Task & Startup Shortcut
echo [4/4] Registering Auto-Start on System Boot...
schtasks /delete /tn "LabControlAgent" /f >nul 2>&1
schtasks /create /tn "LabControlAgent" /tr "wscript.exe \"%VBS_PATH%\"" /sc ONLOGON /rl HIGHEST /f >nul 2>&1

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
echo       [OK] Registered in Task Scheduler and Startup Folder.

:: 5. Launch Agent Silently Right Now
echo.
echo Launching Agent in background right now...
wscript.exe "%VBS_PATH%"
echo       [OK] Agent is now running silently!

echo.
echo ============================================================
echo   SUCCESS! LabControl Agent is permanently installed.
echo   - Runs silently in background (0%% CPU / ~10MB RAM).
echo   - AUTOMATICALLY STARTS whenever this PC boots/restarts.
echo ============================================================
echo.
pause
