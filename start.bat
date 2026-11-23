@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
cd /d "%~dp0"

if exist "%~dp0zhzj-typer.exe" (
    set "RUNDIR=%LOCALAPPDATA%\zhzj-typer-run"
    if not exist "!RUNDIR!" mkdir "!RUNDIR!" >nul 2>nul
    copy /Y "%~dp0zhzj-typer.exe" "!RUNDIR!\zhzj-typer.exe" >nul 2>nul
    if exist "!RUNDIR!\zhzj-typer.exe" (
        start "" "!RUNDIR!\zhzj-typer.exe" %*
        exit /b 0
    )
    start "" "%~dp0zhzj-typer.exe"
    exit /b 0
)

where pythonw >nul 2>nul
if not errorlevel 1 (
    start "" pythonw "%~dp0zhzj_typer.pyw"
    exit /b 0
)

where pyw >nul 2>nul
if not errorlevel 1 (
    start "" pyw "%~dp0zhzj_typer.pyw"
    exit /b 0
)

where python >nul 2>nul
if not errorlevel 1 (
    python "%~dp0zhzj_typer.py" --gui
    exit /b %errorlevel%
)

echo 未找到 Python。请安装 Python 3.10 或更高版本，或直接使用 zhzj-typer.exe。
pause
exit /b 1
