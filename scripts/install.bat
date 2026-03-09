@echo off
REM MiniGeri Installer for Windows 🤖

setlocal enabledelayedexpansion

echo 🤖 Starting MiniGeri installation...

REM Use PowerShell for a more secure and robust installation
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if %errorlevel% neq 0 (
    echo ❌ Installation failed. Please check the error message above.
    exit /b %errorlevel%
)

pause
