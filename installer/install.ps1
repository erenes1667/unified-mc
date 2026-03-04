# Unified Mission Control Installer for Windows
# Usage: powershell -c "& {irm https://raw.githubusercontent.com/erenes1667/unified-mc/main/installer/install.ps1 -OutFile $env:TEMP\umc-install.ps1; & $env:TEMP\umc-install.ps1}"
# Or:   irm https://raw.githubusercontent.com/erenes1667/unified-mc/main/installer/install.ps1 -OutFile install.ps1; .\install.ps1

$ErrorActionPreference = "Stop"

$REPO_URL = "https://github.com/erenes1667/unified-mc.git"
$APP_DIR = "$env:USERPROFILE\.openclaw\workspace\projects\unified-mc"
$INSTALLER_DIR = "$APP_DIR\installer"
$PORT = 5173

function Log($msg) { Write-Host "  [Unified MC] $msg" -ForegroundColor Cyan }
function Success($msg) { Write-Host "  ✓ $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "  ⚠ $msg" -ForegroundColor Yellow }
function Err($msg) { Write-Host "  ✗ $msg" -ForegroundColor Red }

# ── Phase 1: Prerequisites ──────────────────────────────────────────

Write-Host ""
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "    🚀  Unified Mission Control Installer (Windows)" -ForegroundColor White
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

Log "Checking prerequisites..."

# Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Warn "Node.js not found."
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Log "Installing Node.js via winget..."
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $machPath = [System.Environment]::GetEnvironmentVariable('PATH','Machine')
        $userPath = [System.Environment]::GetEnvironmentVariable('PATH','User')
        $env:PATH = "$machPath;$userPath"
    } else {
        Err "Node.js is required. Install from https://nodejs.org or run:"
        Err "  winget install OpenJS.NodeJS.LTS"
        exit 1
    }
}

$nodeRaw = node -v 2>$null
$nodeMajor = $nodeRaw -replace 'v(\d+).*','$1'
$nodeNum = 0 + $nodeMajor
if ($nodeNum -lt 18) {
    Err "Node.js 18+ required. Found: $nodeRaw"
    exit 1
}
Success "Node.js $nodeRaw"

# Git
$git = Get-Command git -ErrorAction SilentlyContinue
if (-not $git) {
    Warn "Git not found."
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($winget) {
        Log "Installing Git via winget..."
        winget install Git.Git --accept-package-agreements --accept-source-agreements
        $machPath = [System.Environment]::GetEnvironmentVariable('PATH','Machine')
        $userPath = [System.Environment]::GetEnvironmentVariable('PATH','User')
        $env:PATH = "$machPath;$userPath"
    } else {
        Err "Git is required. Install from https://git-scm.com"
        exit 1
    }
}
Success "Git available"

# ── Phase 2: Install OpenClaw ────────────────────────────────────────

Log "Checking OpenClaw..."
$openclaw = Get-Command openclaw -ErrorAction SilentlyContinue
if ($openclaw) {
    Success "OpenClaw already installed"
} else {
    Log "Installing OpenClaw globally..."
    npm install -g openclaw 2>$null
    if ($LASTEXITCODE -eq 0) { Success "OpenClaw installed" }
    else { Warn "OpenClaw not available via npm (skipping)" }
}

# ── Phase 3: Clone/Update Repo ───────────────────────────────────────

Log "Setting up repository..."
if (Test-Path "$APP_DIR\.git") {
    Log "Existing repo found, pulling updates..."
    Set-Location $APP_DIR
    git pull origin main 2>$null
    if ($LASTEXITCODE -ne 0) { git pull origin master 2>$null }
} else {
    Log "Cloning fresh repo..."
    $parent = Split-Path $APP_DIR -Parent
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
    git clone $REPO_URL $APP_DIR
    Set-Location $APP_DIR
}
Success "Repository ready at $APP_DIR"

# ── Phase 4: Interactive Onboarding ──────────────────────────────────

Log "Starting onboarding wizard..."
Write-Host ""
node "$INSTALLER_DIR\onboard.mjs"
if ($LASTEXITCODE -ne 0) {
    Err "Onboarding failed"
    exit 1
}

# ── Phase 5: Build & Launch ──────────────────────────────────────────

Log "Installing dependencies..."
Set-Location $APP_DIR
npm install 2>&1 | Select-Object -Last 1
Success "Dependencies installed"

Log "Building application..."
$env:NODE_OPTIONS = "--max-old-space-size=2048"
npm run build 2>&1 | Select-Object -Last 3
Success "Build complete"

# ── Phase 6: Create Startup Task ─────────────────────────────────────

Log "Setting up auto-start..."
$logDir = "$APP_DIR\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$nodePath = (Get-Command node).Source
$taskName = "UnifiedMC"

# Create a startup batch file
$startScript = @"
@echo off
cd /d "$APP_DIR"
set PORT=$PORT
set NODE_ENV=production
"$nodePath" node_modules\next\dist\bin\next start -p $PORT >> "$logDir\stdout.log" 2>> "$logDir\stderr.log"
"@
$startScriptPath = "$APP_DIR\start-umc.bat"
Set-Content -Path $startScriptPath -Value $startScript

# Register as a scheduled task that runs at login
$existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
if ($existingTask) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false 2>$null
}

try {
    $action = New-ScheduledTaskAction -Execute $startScriptPath
    $trigger = New-ScheduledTaskTrigger -AtLogon
    $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Description "Unified Mission Control" | Out-Null
    Success "Startup task registered (runs at login)"
} catch {
    Warn "Could not create startup task (needs admin). Start manually:"
    Warn "  cd $APP_DIR && npm start"
}

# ── Phase 7: Start Now ───────────────────────────────────────────────

Log "Starting application..."
Start-Process -FilePath $startScriptPath -WindowStyle Hidden

Log "Waiting for server..."
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$PORT" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
}

if ($ready) {
    Success "Server running at http://localhost:$PORT"
} else {
    Warn "Server didn't respond in 30s. Check logs: $logDir\stderr.log"
}

# ── Summary ───────────────────────────────────────────────────────────

Write-Host ""
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "    ✅  Installation Complete!" -ForegroundColor Green
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""
Write-Host "    🌐 Open:    http://localhost:$PORT" -ForegroundColor White
Write-Host "    📁 App:     $APP_DIR" -ForegroundColor DarkGray
Write-Host "    ⚙  Config:  $env:USERPROFILE\.openclaw\openclaw.json" -ForegroundColor DarkGray
Write-Host ""
Write-Host "    View logs:  Get-Content $logDir\stderr.log -Tail 20" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host ""

# Open browser
Start-Process "http://localhost:$PORT"
