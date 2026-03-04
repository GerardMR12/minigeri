@echo off
REM MiniGeri Installer for Windows 🤖

setlocal enabledelayedexpansion

echo 🤖 Starting MiniGeri installation...

REM 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install it first from https://nodejs.org/
    exit /b 1
)

REM 2. Determine installation directory
set "INSTALL_DIR=%USERPROFILE%\.minigeri"

if exist "%INSTALL_DIR%" (
    echo ⚠️  Directory %INSTALL_DIR% already exists. Updating existing installation...
    cd /d "%INSTALL_DIR%"
    git pull origin main
) else (
    echo 📦 Cloning MiniGeri repository to %INSTALL_DIR%...
    git clone https://github.com/GerardMR12/minigeri.git "%INSTALL_DIR%"
    cd /d "%INSTALL_DIR%"
)

REM 3. Install dependencies
echo ⚙️  Installing dependencies (this may take a minute)...
call npm install --silent

REM 4. Set up .env
if not exist ".env" (
    echo 📝 Creating default configuration...
    copy .env.example .env
    echo ⚠️  You can set your tokens later inside minigeri using the 'config' command.
)

REM 5. Link binary globally
echo 🔗 Linking minigeri command globally...
call npm link --silent

REM 6. Create local storage directory
if not exist "%USERPROFILE%\.cli-bot\whatsapp-auth" (
    mkdir "%USERPROFILE%\.cli-bot\whatsapp-auth"
)

echo.
echo ✅ MiniGeri installed successfully!
echo You can now run it by typing: minigeri
echo.
echo Next steps:
echo 1. Launch the app: minigeri
echo 2. Set up API keys: minigeri ▸ config set <KEY> <VALUE>
echo 3. Connect WhatsApp: minigeri ▸ wa connect

pause
