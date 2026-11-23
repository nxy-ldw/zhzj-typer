@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "%~dp0typer.log" (
    echo 日志文件：%~dp0typer.log
    echo.
    type "%~dp0typer.log"
) else if exist "%LOCALAPPDATA%\zhzj-typer-run\typer.log" (
    echo 日志文件：%LOCALAPPDATA%\zhzj-typer-run\typer.log
    echo.
    type "%LOCALAPPDATA%\zhzj-typer-run\typer.log"
) else if exist "%LOCALAPPDATA%\zhzj-typer.log" (
    echo 日志文件：%LOCALAPPDATA%\zhzj-typer.log
    echo.
    type "%LOCALAPPDATA%\zhzj-typer.log"
) else (
    echo 还没有日志。请先运行一次 zhzj-typer.exe，并点击“开始输入”。
)
echo.
pause
