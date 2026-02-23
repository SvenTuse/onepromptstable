@echo off
REM Batch script to kill process using port 3001
REM Usage: kill-port.bat [port_number]

set PORT=%1
if "%PORT%"=="" set PORT=3001

echo Checking for processes using port %PORT%...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%PORT% ^| findstr LISTENING') do (
    echo Found process using port %PORT%: PID %%a
    echo Killing process...
    taskkill /PID %%a /F >nul 2>&1
    if errorlevel 1 (
        echo Error: Could not kill process. You may need to run as Administrator.
    ) else (
        echo Process killed successfully!
        echo Port %PORT% is now free.
    )
    goto :done
)

echo Port %PORT% is not in use.

:done
pause
