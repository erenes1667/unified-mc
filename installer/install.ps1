# Unified Mission Control Installer for Windows
# Usage: irm https://raw.githubusercontent.com/erenes1667/unified-mc/main/installer/install.ps1 -OutFile $env:TEMP\umc.ps1; & $env:TEMP\umc.ps1

$ErrorActionPreference = 'Stop'

$REPO_URL = 'https://github.com/erenes1667/unified-mc.git'
$APP_DIR = Join-Path $env:USERPROFILE '.openclaw\workspace\projects\unified-mc'
$PORT = 5173

function Log($msg) { Write-Host "  [UMC] $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "  [OK] $msg" -ForegroundColor Green }
function Bad($msg) { Write-Host "  [!!] $msg" -ForegroundColor Red }
function Caution($msg) { Write-Host "  [!] $msg" -ForegroundColor Yellow }

Write-Host ''
Write-Host '  =================================================' -ForegroundColor Cyan
Write-Host '    Unified Mission Control Installer (Windows)' -ForegroundColor White
Write-Host '  =================================================' -ForegroundColor Cyan
Write-Host ''

# --- Prerequisites ---
Log 'Checking prerequisites...'

$hasNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $hasNode) {
    Caution 'Node.js not found.'
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        Log 'Installing Node.js via winget...'
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        $m = [Environment]::GetEnvironmentVariable('PATH','Machine')
        $u = [Environment]::GetEnvironmentVariable('PATH','User')
        $env:PATH = $m + ';' + $u
    } else {
        Bad 'Node.js is required. Install from https://nodejs.org'
        exit 1
    }
}

$nv = (node -v 2>$null) -replace '[^0-9.]',''
$major = ($nv -split '\.')[0]
if ($major -lt 18) {
    Bad "Node.js 18+ required. Found: v$nv"
    exit 1
}
Ok "Node.js v$nv"

$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
    Caution 'Git not found.'
    $hasWinget = Get-Command winget -ErrorAction SilentlyContinue
    if ($hasWinget) {
        Log 'Installing Git via winget...'
        winget install Git.Git --accept-package-agreements --accept-source-agreements
        $m = [Environment]::GetEnvironmentVariable('PATH','Machine')
        $u = [Environment]::GetEnvironmentVariable('PATH','User')
        $env:PATH = $m + ';' + $u
    } else {
        Bad 'Git is required. Install from https://git-scm.com'
        exit 1
    }
}
Ok 'Git available'

# --- Install OpenClaw ---
Log 'Checking OpenClaw...'
$hasOC = Get-Command openclaw -ErrorAction SilentlyContinue
if ($hasOC) {
    Ok 'OpenClaw already installed'
} else {
    Log 'Installing OpenClaw globally...'
    npm install -g openclaw 2>$null
    if ($LASTEXITCODE -eq 0) { Ok 'OpenClaw installed' }
    else { Caution 'OpenClaw not available via npm (skipping)' }
}

# --- Clone/Update Repo ---
Log 'Setting up repository...'
if (Test-Path (Join-Path $APP_DIR '.git')) {
    Log 'Existing repo found, pulling updates...'
    Set-Location $APP_DIR
    git pull origin main 2>$null
} else {
    Log 'Cloning fresh repo...'
    $parentDir = Split-Path $APP_DIR -Parent
    New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    git clone $REPO_URL $APP_DIR
    Set-Location $APP_DIR
}
Ok "Repository ready at $APP_DIR"

# --- Onboarding ---
Log 'Starting onboarding wizard...'
Write-Host ''
$INSTALLER_DIR = Join-Path $APP_DIR 'installer'
node (Join-Path $INSTALLER_DIR 'onboard.mjs')
if ($LASTEXITCODE -ne 0) {
    Bad 'Onboarding failed'
    exit 1
}

# --- Build ---
Log 'Installing dependencies...'
Set-Location $APP_DIR
npm install 2>&1 | Select-Object -Last 1
Ok 'Dependencies installed'

Log 'Building application (this may take a few minutes)...'
$env:NODE_OPTIONS = '--max-old-space-size=2048'
npm run build 2>&1 | Select-Object -Last 3
Ok 'Build complete'

# --- Auto-start ---
Log 'Setting up auto-start...'
$logDir = Join-Path $APP_DIR 'logs'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$nodePath = (Get-Command node).Source
$batContent = "@echo off`r`ncd /d `"$APP_DIR`"`r`nset PORT=$PORT`r`nset NODE_ENV=production`r`n`"$nodePath`" node_modules\next\dist\bin\next start -p $PORT >> `"$logDir\stdout.log`" 2>> `"$logDir\stderr.log`""
$batPath = Join-Path $APP_DIR 'start-umc.bat'
Set-Content -Path $batPath -Value $batContent -Encoding ASCII

try {
    $taskName = 'UnifiedMC'
    $old = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($old) { Unregister-ScheduledTask -TaskName $taskName -Confirm:$false 2>$null }
    $act = New-ScheduledTaskAction -Execute $batPath
    $trg = New-ScheduledTaskTrigger -AtLogon
    $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit 0
    Register-ScheduledTask -TaskName $taskName -Action $act -Trigger $trg -Settings $set -Description 'Unified Mission Control' | Out-Null
    Ok 'Startup task registered (runs at login)'
} catch {
    Caution 'Could not create startup task. Start manually with: npm start'
}

# --- Start Now ---
Log 'Starting application...'
Start-Process -FilePath $batPath -WindowStyle Hidden

Log 'Waiting for server...'
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 1
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$PORT" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($r.StatusCode -eq 200) { $ready = $true; break }
    } catch {}
}

if ($ready) { Ok "Server running at http://localhost:$PORT" }
else { Caution "Server may still be starting. Check: $logDir\stderr.log" }

# --- Done ---
Write-Host ''
Write-Host '  =================================================' -ForegroundColor Green
Write-Host '    Installation Complete!' -ForegroundColor Green
Write-Host '  =================================================' -ForegroundColor Green
Write-Host ''
Write-Host "    Open:    http://localhost:$PORT" -ForegroundColor White
Write-Host "    App:     $APP_DIR" -ForegroundColor DarkGray
Write-Host "    Config:  $env:USERPROFILE\.openclaw\openclaw.json" -ForegroundColor DarkGray
Write-Host ''
Write-Host "    Logs:    Get-Content $logDir\stderr.log -Tail 20" -ForegroundColor DarkGray
Write-Host ''
Write-Host '  =================================================' -ForegroundColor Green
Write-Host ''

Start-Process "http://localhost:$PORT"
