# MiniGeri Installer for Windows (PowerShell) 🤖

$ErrorActionPreference = "Stop"

Write-Host "🤖 Starting MiniGeri installation..." -ForegroundColor Cyan

# 1. Check for Node.js
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js is not installed. Please install it first from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

$NodeVersion = node -v
if ($NodeVersion -match "v(\d+)\.") {
    $MajorVersion = [int]$matches[1]
    if ($MajorVersion -lt 18) {
        Write-Host "⚠️  Node.js version $NodeVersion detected. MiniGeri works best with Node.js 18 or higher." -ForegroundColor Yellow
    }
}

# 2. Check for Git
if (!(Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Git is not installed. Please install it first from https://git-scm.com/" -ForegroundColor Red
    exit 1
}

# 3. Determine installation directory
$InstallDir = Join-Path $HOME ".minigeri"

if (Test-Path $InstallDir) {
    Write-Host "⚠️  Directory $InstallDir already exists. Updating existing installation..." -ForegroundColor Yellow
    Set-Location $InstallDir
    git pull origin main
} else {
    Write-Host "📦 Cloning MiniGeri repository to $InstallDir..." -ForegroundColor Blue
    git clone https://github.com/GerardMR12/minigeri.git $InstallDir
    Set-Location $InstallDir
}

# 4. Install dependencies
Write-Host "⚙️  Installing dependencies (this may take a minute)..." -ForegroundColor Blue
npm install --silent

# 5. Set up .env
if (!(Test-Path ".env")) {
    Write-Host "📝 Creating .env file from example..." -ForegroundColor Blue
    Copy-Item ".env.example" ".env"
    
    Write-Host "`n🤖 Would you like to set up your API keys now? (y/N)" -NoNewline -ForegroundColor Yellow
    $SetKeys = Read-Host
    if ($SetKeys -match "^[yY]$") {
        Write-Host "Enter your keys (leave blank to skip, input will be hidden):" -ForegroundColor Blue
        
        $AnthropicKey = Read-Host "Anthropic API Key" -AsSecureString
        if ($AnthropicKey) {
            $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($AnthropicKey)
            $UnsecureAnthropicKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            (Get-Content .env) -replace "ANTHROPIC_API_KEY=.*", "ANTHROPIC_API_KEY=$UnsecureAnthropicKey" | Set-Content .env
        }

        $GoogleKey = Read-Host "Google API Key" -AsSecureString
        if ($GoogleKey) {
            $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($GoogleKey)
            $UnsecureGoogleKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            (Get-Content .env) -replace "GOOGLE_API_KEY=.*", "GOOGLE_API_KEY=$UnsecureGoogleKey" | Set-Content .env
        }

        $GroqKey = Read-Host "Groq API Key" -AsSecureString
        if ($GroqKey) {
            $BSTR = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($GroqKey)
            $UnsecureGroqKey = [Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
            (Get-Content .env) -replace "GROQ_API_KEY=.*", "GROQ_API_KEY=$UnsecureGroqKey" | Set-Content .env
        }
        
        Write-Host "✅ Keys saved to .env file!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Skipping interactive setup. You can set your keys later inside minigeri using the 'config' command." -ForegroundColor Yellow
    }
}

# 6. Link binary globally
Write-Host "🔗 Linking minigeri command globally..." -ForegroundColor Blue
# Try to link, and if it fails (often due to permissions), suggest running as admin
try {
    npm link --silent
} catch {
    Write-Host "⚠️  Failed to link globally. You might need to run PowerShell as Administrator." -ForegroundColor Yellow
    Write-Host "Try running: npm link" -ForegroundColor Gray
}

# 7. Create local storage directory
$AuthDir = Join-Path $HOME ".cli-bot\whatsapp-auth"
if (!(Test-Path $AuthDir)) {
    New-Item -ItemType Directory -Force -Path $AuthDir | Out-Null
}

Write-Host "`n✅ MiniGeri installed successfully!" -ForegroundColor Green
Write-Host "You can now run it by typing: " -NoNewline
Write-Host "minigeri" -ForegroundColor Cyan
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Launch the app: minigeri"
Write-Host "2. Set up API keys: minigeri ▸ config set <KEY> <VALUE>"
Write-Host "3. Connect WhatsApp: minigeri ▸ wa connect"
